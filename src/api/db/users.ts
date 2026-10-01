"use server";
import { createClient } from '@/utils/supabase/server';
import { userRole } from '@prisma/client'
import { User } from '@prisma/client'
import prisma from '../prisma';
import { resolveBaptemeHold } from './baptemeHold';
import { canViewPlane, isPrivatePlane } from '@/lib/planeVisibility';
import { managerBookingWarning } from '@/lib/wallet';
import { canSwitchClub } from '@/lib/clubAccess';

const MANAGEMENT_ROLES: userRole[] = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER];

// Non-blocking warning when management books a student / pilot whose balance is
// below the club booking threshold, with the wallet enabled (AER-66, AER-73).
async function walletBookingWarning(memberID: string, clubID: string | null): Promise<string | null> {
    if (!clubID) return null;
    const [club, member, wallet] = await Promise.all([
        prisma.club.findUnique({ where: { id: clubID }, select: { walletEnabled: true, walletBookingMinCents: true } }),
        prisma.user.findUnique({ where: { id: memberID }, select: { clubID: true, role: true, firstName: true, lastName: true } }),
        prisma.wallet.findUnique({ where: { clubID_userID: { clubID, userID: memberID } }, select: { balanceCents: true } }),
    ]);
    // Pure, tested decision (see managerBookingWarning in src/lib/wallet.ts).
    return managerBookingWarning({
        walletEnabled: !!club?.walletEnabled,
        clubID,
        member,
        balanceCents: wallet?.balanceCents ?? 0,
        bookingMinCents: club?.walletBookingMinCents ?? 0,
    });
}

export async function requireAuth(allowedRoles?: userRole[]) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.email) {
        return { error: "Non autorisé" };
    }
    const user = await prisma.user.findUnique({ where: { email: data.user.email } });
    if (!user) {
        return { error: "Non autorisé" };
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return { error: "Permissions insuffisantes" };
    }
    return { user };
}

export interface InvitedStudent {
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
}


export const getAllUser = async (clubID: string) => {
    const auth = await requireAuth();
    if ('error' in auth) return { error: auth.error };
    if (auth.user.clubID !== clubID) return { error: "Permissions insuffisantes" };

    try {
        const users = await prisma.user.findMany({
            where: {
                clubID: clubID
            }
        })
        return users;
    } catch {
        return { error: "Erreur lors de la récupération des utilisateurs" };
    }

}

export const getSession = async () => {
    const supabase = await createClient()
    try {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        return user;
    } catch {
        return { error: "No session available" }
    }



}

export const getUser = async () => {
    const supabase = await createClient()
    try {
        const { data, error: authError } = await supabase.auth.getUser();
        if (authError || !data?.user) {
            return { error: "Utilisateur non connecté ou session invalide." };
        }

        const userEmail = data.user.email;
        if (!userEmail) {
            return { error: "Session utilisateur invalide." };
        }

        const user = await prisma.user.findUnique({
            where: { email: userEmail },
        });

        if (!user) {
            return { error: "Utilisateur introuvable." };
        }

        return {
            success: "Utilisateur récupéré avec succès",
            user,
        };
    } catch {
        return { error: "Une erreur inattendue est survenue lors de la récupération de l'utilisateur." };
    }
};


export const addStudentToSession = async (sessionID: string, student: { id: string, firstName: string, lastName: string, planeId: string, email: string, phone: string }, timeOffset: number) => {
    const auth = await requireAuth(MANAGEMENT_ROLES);
    if ('error' in auth) return { error: auth.error };

    const nowDate = new Date();
    nowDate.setMinutes(nowDate.getMinutes() - timeOffset);

    if (!sessionID || !student.id || !student.firstName || !student.lastName || !student.planeId || !student.email || !student.phone) {
        return { error: "Une erreur est survenue (E_001: paramètres invalides)" };
    }

    try {
        // Step 1: load the critical data
        const [session, plane] = await Promise.all([
            prisma.flight_sessions.findUnique({
                where: { id: sessionID },
                select: {
                    id: true,
                    pilotID: true,
                    sessionDateStart: true,
                    sessionDateDuration_min: true,
                    clubID: true,
                },
            }),
            prisma.planes.findUnique({
                where: { id: student.planeId },
            })
        ]);

        if (!session) {
            return { error: "Session introuvable." };
        }

        if (session.clubID !== auth.user.clubID) {
            return { error: "Permissions insuffisantes." };
        }

        // A slot held by a pending discovery-flight request cannot be given to a
        // student / guest until the hold is released.
        const holdState = await resolveBaptemeHold(sessionID);
        if (holdState.held) {
            return { error: "Ce créneau est réservé pour un baptême en attente de validation." };
        }

        if (student.planeId != "classroomSession" && !plane?.operational) {
            return { error: "L'avion est désactivé par l'administrateur du club." };
        }

        // Defense in depth, symmetric with studentRegistration: the plane is validated
        // from the booked STUDENT's point of view, not the manager entering it. A private
        // plane can therefore only go to its owner, and an external guest (no account)
        // only gets club planes.
        if (plane && isPrivatePlane(plane)) {
            const beneficiary = await prisma.user.findUnique({ where: { id: student.id } });
            if (!beneficiary || !canViewPlane(plane, beneficiary)) {
                return { error: "Cette machine privée n'appartient pas à l'élève inscrit." };
            }
        }

        if (session.sessionDateStart < nowDate) {
            return { error: "La date de la session est passée." };
        }

        // Step 2: update the session
        await prisma.flight_sessions.update({
            where: { id: sessionID },
            data: {
                studentID: student.id,
                studentFirstName: student.firstName,
                studentLastName: student.lastName,
                studentPlaneID: student.planeId,
                studentEmail: student.email,
                studentPhone: student.phone,
            },
        });

        // Wallet: booking is allowed even with a balance ≤ 0, but a warning is returned.
        const warning = await walletBookingWarning(student.id, auth.user.clubID);

        return { success: "L'élève a été ajouté au vol !", ...(warning && { warning }) };

    } catch {
        return { error: "Erreur lors de l'ajout de l'élève au vol." };
    }
};


export const deleteUser = async (studentID: string) => {
    if (!studentID) {
        return { error: "Une erreur est survenue (E_001: studentID is undefined)" };
    }

    const auth = await requireAuth(MANAGEMENT_ROLES);
    if ('error' in auth) return { error: auth.error };

    const target = await prisma.user.findUnique({ where: { id: studentID } });
    if (!target || target.clubID !== auth.user.clubID) {
        return { error: "Utilisateur introuvable dans votre club." };
    }

    try {
        await prisma.user.update({
            where: { id: studentID },
            data: {
                clubID: null,
                restricted: false,
                classes: [],
                role: userRole.USER
            }
        });
        return { success: "L'utilisateur a été supprimé de votre club avec succès !" };
    } catch {
        return { error: "Erreur lors de la suppression de l'utilisateur" };
    }
}

export const updateUser = async (user: User) => {
    if (!user.id) {
        return { error: "Une erreur est survenue (E_001: user.id is undefined)" };
    }

    const auth = await requireAuth();
    if ('error' in auth) return { error: auth.error };

    const isSelf = auth.user.id === user.id;
    const isManager = MANAGEMENT_ROLES.includes(auth.user.role);

    if (!isSelf && !isManager) {
        return { error: "Permissions insuffisantes" };
    }

    if (!isSelf) {
        const target = await prisma.user.findUnique({ where: { id: user.id } });
        if (!target || target.clubID !== auth.user.clubID) {
            return { error: "Utilisateur introuvable dans votre club." };
        }
    }

    try {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                clubID: user.clubID,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                adress: user.adress,
                city: user.city,
                zipCode: user.zipCode,
                role: isSelf && !isManager ? auth.user.role : user.role,
                restricted: isSelf && !isManager ? auth.user.restricted : user.restricted,
                country: user.country,
                classes: user.classes,
            }
        });
        return { success: "L'utilisateur a été mis à jour avec succès !" };
    } catch {
        return { error: "Erreur lors de la mise à jour de l'utilisateur" };
    }
}

export const blockUser = async (userID: string, restricted: boolean) => {
    if (!userID) {
        return { error: "Une erreur est survenue (E_001: userID is undefined)" };
    }

    const auth = await requireAuth(MANAGEMENT_ROLES);
    if ('error' in auth) return { error: auth.error };

    const target = await prisma.user.findUnique({ where: { id: userID } });
    if (!target || target.clubID !== auth.user.clubID) {
        return { error: "Utilisateur introuvable dans votre club." };
    }

    try {
        await prisma.user.update({
            where: { id: userID },
            data: { restricted }
        });
        return { success: "L'utilisateur a été bloqué avec succès !" };
    } catch {
        return { error: "Erreur lors de la mise à jour de l'utilisateur" };
    }
}

export const updateUserClub = async (userID: string, clubID: string) => {
    if (!userID) {
        return { error: "Une erreur est survenue (E_001: userID is undefined)" };
    }

    const auth = await requireAuth([userRole.ADMIN]);
    if ('error' in auth) return { error: auth.error };
    if (!canSwitchClub(auth.user, userID)) {
        return { error: "Permissions insuffisantes" };
    }

    try {
        const club = await prisma.club.findUnique({ where: { id: clubID }, select: { id: true } });
        if (!club) return { error: "Club introuvable" };

        await prisma.user.update({
            where: { id: userID },
            data: { clubID }
        });
        return { success: "L'utilisateur a été mis à jour avec succès !" };
    } catch {
        return { error: "Erreur lors de la mise à jour de l'utilisateur" };
    }
}