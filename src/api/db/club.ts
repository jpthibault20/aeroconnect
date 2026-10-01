"use server";
import codeNewClubIsValid from "@/api/client/newClubValidation";
import { clubFormSchema, ClubFormValues } from "@/schemas/club";
import { defaultMinutes } from "@/config/config";
import { dayFr } from "@/config/config";
import { sendNotificationRequestClub } from "@/lib/mail";
import { sanitizeBookingMinCents, sanitizeRateCents } from "@/lib/wallet";
import { userRole } from "@prisma/client";
import prisma from "../prisma";
import { requireAuth } from "./users";

const MANAGEMENT_ROLES: userRole[] = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER];

export const getAllClubs = async () => {
    const auth = await requireAuth();
    if ("error" in auth) return [];

    try {
        const clubs = await prisma.club.findMany({
            select: {
                id: true,
                Name: true,
            },
        });

        const result = clubs.map((club) => ({
            id: club.id,
            name: `${club.id} (${club.Name})`,
        }));

        return result;
    } catch {
        return [];
    }
};

// Name only: called by a member who is not in the club yet, and the full row
// holds the public booking token, contact details and wallet settings.
export const getClub = async (clubID: string) => {
    const auth = await requireAuth();
    if ("error" in auth) return;

    try {
        const club = await prisma.club.findUnique({
            where: {
                id: clubID,
            },
            select: { id: true, Name: true },
        });

        return club;
    } catch {
        return;
    }
};

// The creator becomes OWNER of the new club, so this is a privilege grant: the
// user is always the signed-in one (never a client parameter), the security code
// is re-checked here (the client-side OTP step can be bypassed), and the user is
// only attached once the club has actually been created, never to an existing one.
export const createClub = async (input: ClubFormValues, code: number) => {
    const auth = await requireAuth();
    if ("error" in auth) return { error: auth.error };
    if (auth.user.clubID) return { error: "Vous êtes déjà rattaché à un club." };

    if (!(await codeNewClubIsValid(code))) return { error: "Code de sécurité incorrect." };

    const parsed = clubFormSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Saisie invalide" };
    const data = parsed.data;

    const startHour = parseInt(data.workStartTime, 10);
    const endHour = parseInt(data.workEndTime, 10);

    const allWorkingHour: number[] = Array.from(
        { length: endHour - startHour },
        (_, i) => startHour + i
    );

    try {
        await prisma.$transaction([
            prisma.club.create({
                data: {
                    id: data.id,
                    Name: data.name,
                    Address: data.address,
                    City: data.city,
                    ZipCode: data.zipCode,
                    OwnerId: [auth.user.id],
                    DaysOn: dayFr,
                    HoursOn: allWorkingHour,
                    SessionDurationMin: data.sessionDuration,
                    AvailableMinutes: defaultMinutes,
                },
            }),
            prisma.user.update({
                where: { id: auth.user.id },
                data: {
                    clubID: data.id,
                    clubIDRequest: null,
                    role: userRole.OWNER,
                },
            }),
        ]);
        return { success: "Club créé avec succès !" };
    } catch {
        return { error: "Erreur lors de la création du club ou club déjà existant" };
    }
};

// Always the signed-in user: a request filed on someone else's behalf could then
// be accepted to pull them into another club.
export const requestClubID = async (clubID: string) => {
    if (!clubID) {
        return { error: "Une erreur est survenue (E_001: clubID is undefined)" };
    }

    const auth = await requireAuth();
    if ("error" in auth) return { error: auth.error };
    if (auth.user.clubID) return { error: "Vous êtes déjà rattaché à un club." };

    try {
        const club = await prisma.club.findUnique({ where: { id: clubID }, select: { id: true } });
        if (!club) return { error: "Le club demandé est introuvable." };

        await prisma.user.update({
            where: {
                id: auth.user.id
            },
            data: {
                clubIDRequest: clubID
            }
        });
        return { success: "L'utilisateur a été mis à jour avec succès !" };
    } catch {
        return { error: "Erreur lors de la mise à jour de l'utilisateur" };
    }
}

// Pending membership requests: personal data (email, phone) of the applicants,
// restricted to club management.
export const getAllUserRequestedClubID = async (clubID: string) => {
    const auth = await requireAuth(MANAGEMENT_ROLES);
    if ('error' in auth) return { error: auth.error };
    if (auth.user.clubID !== clubID) return { error: "Permissions insuffisantes" };

    try {
        const user = await prisma.user.findMany({
            where: {
                clubIDRequest: clubID
            }
        })
        return user;
    } catch {
        return { error: "Erreur lors de la récupération des utilisateurs" };
    }
}

export const acceptMembershipRequest = async (userID: string, clubID: string | null, role: userRole, classes: number[]) => {
    if (!userID) {
        return { error: "Une erreur est survenue (E_001: userID is undefined)" };
    }
    if (!clubID) {
        return { error: "Une erreur est survenue (E_001: clubID is undefined)" };
    }

    const auth = await requireAuth(MANAGEMENT_ROLES);
    if ('error' in auth) return { error: auth.error };

    if (auth.user.clubID !== clubID) {
        return { error: "Permissions insuffisantes" };
    }

    try {
        // Only a pending request for THIS club can be accepted: otherwise a manager
        // could pull any user (from any club) into their own. The condition sits in
        // the update itself so it cannot race with a withdrawn request.
        const accepted = await prisma.user.updateMany({
            where: {
                id: userID,
                clubIDRequest: clubID,
            },
            data: {
                clubIDRequest: null,
                clubID: clubID,
                role: role,
                classes: classes
            },
        });
        if (accepted.count !== 1) {
            return { error: "Aucune demande d'adhésion en attente pour ce membre." };
        }

        const user = await prisma.user.findUnique({ where: { id: userID }, select: { email: true } });
        if (user?.email) await sendNotificationRequestClub(user.email, clubID)

        return { success: "L'utilisateur a été mis à jour avec succès !" };
    } catch {
        return { error: "Erreur lors de la mise à jour de l'utilisateur" };
    }
};

export const rejectMembershipRequest = async (userID: string) => {
    if (!userID) {
        return { error: "Une erreur est survenue (E_001: userID is undefined)" };
    }

    const auth = await requireAuth(MANAGEMENT_ROLES);
    if ('error' in auth) return { error: auth.error };

    if (!auth.user.clubID) return { error: "Permissions insuffisantes" };

    try {
        // Only requests addressed to the manager's own club.
        const rejected = await prisma.user.updateMany({
            where: {
                id: userID,
                clubIDRequest: auth.user.clubID,
            },
            data: {
                clubIDRequest: null
            }
        });
        if (rejected.count !== 1) {
            return { error: "Aucune demande d'adhésion en attente pour ce membre." };
        }
        return { success: "L'utilisateur a été mis à jour avec succès !" };
    } catch {
        return { error: "Erreur lors de la mise à jour de l'utilisateur" };
    }
};

export interface ConfigClub {
    clubName: string;
    clubId: string;
    address: string;
    city: string;
    zipCode: string;
    country: string;
    owners: string[]; // by ID or name
    classes: number[]; // ULM class IDs
    hourStart: string; // HH:mm
    hourEnd: string; // HH:mm
    timeOfSession: number; // minutes
    userCanSubscribe: boolean;
    preSubscribe: boolean;
    timeDelaySubscribeminutes: number; // minutes
    userCanUnsubscribe: boolean;
    preUnsubscribe: boolean;
    timeDelayUnsubscribeminutes: number; // minutes
    firstNameContact: string;
    lastNameContact: string;
    mailContact: string;
    phoneContact: string;
    walletEnabled?: boolean; // student wallet (AER-66)
    instructorHourlyRateCents?: number | null; // instructor rate (private plane), cents/h
    walletBookingMinCents?: number; // minimum balance to book (AER-73), cents, may be negative
    walletLowBalanceEmail?: boolean; // "low balance" email enabled (AER-73)
}

export const updateClub = async (clubID: string, data: ConfigClub) => {
    const auth = await requireAuth([userRole.OWNER, userRole.ADMIN]);
    if ('error' in auth) return { error: auth.error };

    if (auth.user.clubID !== clubID) {
        return { error: "Permissions insuffisantes" };
    }

    const instructorRate = sanitizeRateCents(data.instructorHourlyRateCents);
    if (instructorRate === undefined) {
        return { error: "Tarif horaire instructeur invalide" };
    }
    const bookingMin = data.walletBookingMinCents === undefined ? undefined : sanitizeBookingMinCents(data.walletBookingMinCents);
    if (data.walletBookingMinCents !== undefined && bookingMin === undefined) {
        return { error: "Solde minimum pour réserver invalide" };
    }

    // layout of working hours
    const workingHour: number[] = [];
    const startHour = parseInt(data.hourStart.split(":")[0], 10);
    const endHour = parseInt(data.hourEnd.split(":")[0], 10);
    for (let i = startHour; i <= endHour; i++) {
        workingHour.push(i);
    }

    try {
const updateClub = prisma.club.update({
    where: {
        id: clubID,
    },
    data: {
        Name: data.clubName,
        Address: data.address,
        City: data.city,
        ZipCode: data.zipCode,
        Country: data.country,
        OwnerId: data.owners,
        classes: data.classes,
        HoursOn: workingHour,
        SessionDurationMin: data.timeOfSession,
        userCanSubscribe: data.userCanSubscribe,
        preSubscribe: data.preSubscribe,
        timeDelaySubscribeminutes: data.timeDelaySubscribeminutes,
        userCanUnsubscribe: data.userCanUnsubscribe,
        preUnsubscribe: data.preUnsubscribe,
        timeDelayUnsubscribeminutes: data.timeDelayUnsubscribeminutes,
        firstNameContact: data.firstNameContact,
        lastNameContact: data.lastNameContact,
        mailContact: data.mailContact,
        phoneContact: data.phoneContact,
        ...(data.walletEnabled !== undefined && { walletEnabled: data.walletEnabled }),
        ...(data.instructorHourlyRateCents !== undefined && { instructorHourlyRateCents: instructorRate }),
        ...(bookingMin !== undefined && { walletBookingMinCents: bookingMin }),
        ...(data.walletLowBalanceEmail !== undefined && { walletLowBalanceEmail: data.walletLowBalanceEmail === true }),
    },
});

// Update the owners
const updateOwners = Promise.all(
    data.owners.map((ownerId: string) =>
        prisma.user.update({
            where: { id: ownerId },
            data: {
                classes: data.classes,
            },
        })
    )
);

await Promise.all([updateClub, updateOwners]);


        return { success: "La configuration a été mise à jour avec succès !" };
    } catch {
        return { error: "Erreur lors de la mise à jour de la configuration" };
    }
};