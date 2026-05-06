"use server";
import { createClient } from '@/utils/supabase/server';
import { userRole } from '@prisma/client'
import { User } from '@prisma/client'
import prisma from '../prisma';

const MANAGEMENT_ROLES: userRole[] = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER];

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

interface UserMin {
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
}

export const createUser = async (dataUser: UserMin) => {
    if (!dataUser.firstName || !dataUser.lastName || !dataUser.email || !dataUser.phone) {
        return { error: 'Missing required fields' }
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const user = await prisma.user.create({
            data: {
                firstName: dataUser.firstName,
                lastName: dataUser.lastName,
                email: dataUser.email,
                phone: dataUser.phone,
            },
        });
        return { succes: "User created successfully" };

    } catch {
        return {
            error: 'User creation failed',
        };
    }
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

// récupération de la session de l'utilisateur
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
        // Étape 1 : Charger les données critiques
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

        // Vérifications critiques
        if (!session) {
            return { error: "Session introuvable." };
        }

        if (session.clubID !== auth.user.clubID) {
            return { error: "Permissions insuffisantes." };
        }

        if (student.planeId != "classroomSession" && student.planeId != "noPlane" && !plane?.operational) {
            return { error: "L'avion est désactivé par l'administrateur du club." };
        }

        if (session.sessionDateStart < nowDate) {
            return { error: "La date de la session est passée." };
        }

        // Étape 2 : Mise à jour rapide de la session
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

        return { success: "L'élève a été ajouté au vol !" };

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
                canSubscribeWithoutPlan: user.canSubscribeWithoutPlan,
            }
        });
        return { success: "L'utilisateur a été mis à jour avec succès !" };
    } catch {
        return { error: "Erreur lors de la mise à jour de l'utilisateur" };
    }
}

export const getUserByID = async (id: string[]) => {
    try {
        const user = await prisma.user.findMany({
            where: {
                id: {
                    in: id
                }
            }
        })
        return user;
    } catch {
        return { error: "Erreur lors de la récupération des utilisateurs" };
    }

}

export const getInsctructors = async (clubID: string | undefined) => {
    if (!clubID) {
        return { error: "Une erreur est survenue (E_001: clubID is undefined)" };
    }
    try {
        const instructors = await prisma.user.findMany({
            where: {
                clubID,
                role: { in: [userRole.INSTRUCTOR, userRole.ADMIN, userRole.OWNER] }
            }
        })
        return instructors;
    } catch {
        return { error: "Erreur lors de la récupération des instructeurs" };
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

    const auth = await requireAuth(MANAGEMENT_ROLES);
    if ('error' in auth) return { error: auth.error };

    try {
        await prisma.user.update({
            where: { id: userID },
            data: { clubID }
        });
        return { success: "L'utilisateur a été mis à jour avec succès !" };
    } catch {
        return { error: "Erreur lors de la mise à jour de l'utilisateur" };
    }
}