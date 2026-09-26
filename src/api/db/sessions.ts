"use server";

import { NatureOfTheft, User, userRole } from '@prisma/client';
import prisma from '../prisma';
import { requireAuth } from './users';
import { resolveBaptemeHold } from './baptemeHold';
import { toClubWallClock } from '@/lib/clubTime';
import {
    canCreateSessionsFor,
    checkStudentRegistration,
    checkStudentRemoval,
    CLASSROOM_SESSION_ID,
    resolveCommentUpdate,
} from '@/lib/sessionRules';
import { bookingWalletBlock, isBookingGatedRole } from '@/lib/wallet';

const MANAGEMENT_ROLES: userRole[] = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER, userRole.INSTRUCTOR];
const ADMIN_ROLES: userRole[] = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER];

// Blocking message if the user (STUDENT / PILOT) has a balance ≤ 0 in a club
// whose wallet is enabled; null otherwise.
async function checkWalletBooking(user: User): Promise<string | null> {
    if (!user.clubID || !isBookingGatedRole(user.role)) return null;
    const club = await prisma.club.findUnique({ where: { id: user.clubID } });
    if (!club?.walletEnabled) return null;
    const wallet = await prisma.wallet.findUnique({
        where: { clubID_userID: { clubID: club.id, userID: user.id } },
        select: { balanceCents: true },
    });
    // Pure, tested decision (see bookingWalletBlock in src/lib/wallet.ts).
    return bookingWalletBlock({ walletEnabled: club.walletEnabled, role: user.role, balanceCents: wallet?.balanceCents ?? 0, contact: club });
}

export interface interfaceSessions {
    instructorId: string;
    date: Date | undefined;
    startHour: string;
    startMinute: string;
    endHour: string;
    endMinute: string;
    duration: number;
    endReccurence: Date | undefined;
    planeId: string[];
    classes: number[];
    comment: string;
    // Flight types of the slot (multi-select). DISCOVERY marks a discovery-flight
    // slot, exposed to the public through the booking link.
    natureOfTheft: NatureOfTheft[];
}

export const checkSessionDate = async (sessionData: interfaceSessions, instructorInput: Pick<User, "id"> | undefined) => {
    if (!sessionData.date) {
        return { error: "La date de la session est obligatoire" };
    }

    if (!instructorInput) {
        return { error: "L'instructeur est obligatoire" };
    }

    // Only the instructor ID comes from the client: it is re-read from the DB and
    // must belong to the signed-in user's club (AER-67).
    const auth = await requireAuth(MANAGEMENT_ROLES);
    if ('error' in auth) return { error: auth.error };
    const user = await prisma.user.findUnique({ where: { id: instructorInput.id } });
    const allowed = canCreateSessionsFor(auth.user, user, ADMIN_ROLES);
    if (!allowed.ok) return { error: allowed.error };
    if (!user) return { error: "L'instructeur est obligatoire" };

    const now = new Date();

    if (new Date(sessionData.date.getFullYear(), sessionData.date.getMonth(), sessionData.date.getDate(), Number(sessionData.startHour), Number(sessionData.startMinute), 0).getTime() <= new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getUTCHours(), now.getUTCMinutes(), 0).getTime()) {
        return { error: "La date de session doit être dans le futur" };
    }

    const débutTotalMinutes = parseInt(sessionData.startHour) * 60 + parseInt(sessionData.startMinute);
    const finTotalMinutes = parseInt(sessionData.endHour) * 60 + parseInt(sessionData.endMinute);

    if (débutTotalMinutes >= finTotalMinutes) {
        return { error: "L'heure de fin doit être après l'heure de début" };
    }

    const différenceMinutes = finTotalMinutes - débutTotalMinutes;
    if (différenceMinutes < sessionData.duration || différenceMinutes % sessionData.duration !== 0) {
        return { error: `La durée de la session doit être supérieure à ${sessionData.duration} minutes et un multiple de ${sessionData.duration} minutes` };
    }

    if (sessionData.endReccurence && sessionData.endReccurence <= sessionData.date) {
        return { error: "La date de fin de récurrence doit être après la date de début" };
    }

    if (sessionData.planeId.length == 0) {
        return { error: "Veuillez sélectionner des appareils ou définir la session comme une session théorique" }
    }

    const baseSessionDateStart = new Date(Date.UTC(
        sessionData.date.getUTCFullYear(),
        sessionData.date.getUTCMonth(),
        sessionData.date.getUTCDate(),
        Number(sessionData.startHour),
        Number(sessionData.startMinute),
        0
    ));

    const sessionsToCreate: Date[] = [];
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
    const dateEndSession = new Date(Date.UTC(
        baseSessionDateStart.getUTCFullYear(),
        baseSessionDateStart.getUTCMonth(),
        baseSessionDateStart.getUTCDate(),
        Number(sessionData.endHour),
        Number(sessionData.endMinute),
        0
    ));

    if (sessionData.endReccurence) {
        sessionData.endReccurence.setUTCDate(sessionData.endReccurence.getUTCDate() + 1);
        for (let current = baseSessionDateStart; current <= sessionData.endReccurence; current = new Date(current.getTime() + oneWeekInMs)) {
            const sartCurrent = new Date(current.getTime());
            const endCurrent = new Date(current.getTime());
            endCurrent.setUTCHours(Number(sessionData.endHour), Number(sessionData.endMinute), 0);

            while (sartCurrent.getTime() < endCurrent.getTime()) {
                sessionsToCreate.push(new Date(sartCurrent));
                sartCurrent.setUTCMinutes(sartCurrent.getUTCMinutes() + sessionData.duration);
            }
        }
    } else {
        while (baseSessionDateStart.getTime() < dateEndSession.getTime()) {
            sessionsToCreate.push(new Date(baseSessionDateStart));
            baseSessionDateStart.setUTCMinutes(baseSessionDateStart.getUTCMinutes() + sessionData.duration);
        }
    }

    // Check conflicts for every session to create in a single query
    const existingSessions = await prisma.flight_sessions.findMany({
        where: {
            clubID: user.clubID as string,
            pilotID: user.id,
            sessionDateStart: { in: sessionsToCreate },
        }
    });


    if (existingSessions.length > 0) {
        return { error: "Une session existe déjà avec cette configuration pour l'une des dates." };
    }


}

export const newSession = async (sessionData: interfaceSessions, instructorInput: Pick<User, "id"> | undefined) => {
    if (!sessionData.date) {
        return { error: "La date de la session est obligatoire" };
    }

    if (!instructorInput) {
        return { error: "L'instructeur est obligatoire" };
    }

    const auth = await requireAuth(MANAGEMENT_ROLES);
    if ('error' in auth) return { error: auth.error };

    // ADMIN/OWNER/MANAGER can create for any instructor of the same club, others for
    // themselves. The instructor (name, club) is re-read from the DB: only its ID
    // comes from the client (AER-67).
    const instructor = await prisma.user.findUnique({ where: { id: instructorInput.id } });
    const allowed = canCreateSessionsFor(auth.user, instructor, ADMIN_ROLES);
    if (!allowed.ok) return { error: allowed.error };
    if (!instructor) return { error: "L'instructeur est obligatoire" };

    const baseSessionDateStart = new Date(Date.UTC(
        sessionData.date.getUTCFullYear(),
        sessionData.date.getUTCMonth(),
        sessionData.date.getUTCDate(),
        Number(sessionData.startHour),
        Number(sessionData.startMinute),
        0
    ));

    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
    const sessionDurationMs = sessionData.duration * 60 * 1000;
    const sessionsToCreate: { sessionDateStart: Date; sessionDateDuration_min: number }[] = [];

    if (sessionData.endReccurence) {
        const endReccurence = new Date(sessionData.endReccurence);
        endReccurence.setUTCDate(endReccurence.getUTCDate() + 1);

        for (let current = baseSessionDateStart; current <= endReccurence; current = new Date(current.getTime() + oneWeekInMs)) {
            const startTime = current.getTime();
            const endTime = new Date(current).setUTCHours(Number(sessionData.endHour), Number(sessionData.endMinute), 0);

            for (let currentTime = startTime; currentTime < endTime; currentTime += sessionDurationMs) {
                sessionsToCreate.push({
                    sessionDateStart: new Date(currentTime),
                    sessionDateDuration_min: sessionData.duration,
                });
            }
        }
    } else {
        const dateEndSession = new Date(Date.UTC(
            baseSessionDateStart.getUTCFullYear(),
            baseSessionDateStart.getUTCMonth(),
            baseSessionDateStart.getUTCDate(),
            Number(sessionData.endHour),
            Number(sessionData.endMinute),
            0
        ));

        for (let currentTime = baseSessionDateStart.getTime(); currentTime < dateEndSession.getTime(); currentTime += sessionDurationMs) {
            sessionsToCreate.push({
                sessionDateStart: new Date(currentTime),
                sessionDateDuration_min: sessionData.duration,
            });
        }
    }

    try {
        // Batch Prisma transactions for better performance
        const batchSize = 100; 
        const createdSessions = [];
        for (let i = 0; i < sessionsToCreate.length; i += batchSize) {
            const batch = sessionsToCreate.slice(i, i + batchSize);
            const result = await prisma.$transaction(
                batch.map(session =>
                    prisma.flight_sessions.create({
                        data: {
                            clubID: instructor.clubID as string,
                            sessionDateStart: session.sessionDateStart,
                            sessionDateDuration_min: session.sessionDateDuration_min,
                            finalReccurence: sessionData.endReccurence,
                            pilotID: instructor.id,
                            pilotFirstName: instructor.firstName,
                            pilotLastName: instructor.lastName,
                            pilotComment: sessionData.comment,
                            studentID: null,
                            studentFirstName: null,
                            studentLastName: null,
                            student_type: null,
                            planeID: sessionData.planeId,
                            classes: sessionData.classes,
                            natureOfTheft: sessionData.natureOfTheft,
                        }
                    })
                )
            );
            createdSessions.push(...result);
        }

        return { success: "Les sessions ont été créées !", sessions: createdSessions };
    } catch {
        return { error: "Erreur lors de la création des sessions de vol" };
    }
};

export const removeSessionsByID = async (sessionIDs: string[]) => {
    const auth = await requireAuth(MANAGEMENT_ROLES);
    if ('error' in auth) return { error: auth.error };

    try {
        await prisma.flight_sessions.deleteMany({
            where: {
                id: { in: sessionIDs },
                clubID: auth.user.clubID as string,
            },
        });

        return { success: "Les sessions ont été supprimées !" };
    } catch {
        return { error: "Erreur lors de la suppression des sessions de vol" };
    }
};

/**
 * Removes a student from a slot. Only the slot ID comes from the client: session,
 * club and user are re-read from the DB (AER-67). Rules in checkStudentRemoval
 * (src/lib/sessionRules.ts).
 */
export const removeStudentFromSessionID = async (sessionID: string) => {
    const auth = await requireAuth();
    if ('error' in auth) return { error: auth.error };
    if (!sessionID) return { error: "Session introuvable ou incomplète." };

    try {
        const session = await prisma.flight_sessions.findUnique({ where: { id: sessionID } });
        if (!session) return { error: "Session introuvable ou incomplète." };
        const club = await prisma.club.findUnique({ where: { id: session.clubID } });
        if (!club) return { error: "Session introuvable ou non accessible." };

        const check = checkStudentRemoval({
            user: auth.user,
            club,
            session,
            now: toClubWallClock(new Date()),
        });
        if (!check.ok) return { error: check.error };

        await prisma.flight_sessions.update({
            where: { id: session.id },
            data: {
                studentID: null,
                studentFirstName: null,
                studentLastName: null,
                studentEmail: null,
                studentPhone: null,
                student_type: null,
                studentPlaneID: null,
                studentComment: null,
            }
        });

        return { success: "L'élève a été désinscrit de la session !" };
    } catch {
        return { error: "Erreur lors de la suppression de la session de vol" };
    }
};

/**
 * Books the SIGNED-IN user on a slot. Only the slot, plane and comment come from
 * the client: user, club, slot and plane are re-read from the DB (AER-67).
 * Booking someone else goes through addStudentToSession (management). Rules in
 * checkStudentRegistration.
 */
export const studentRegistration = async (sessionID: string, planeID: string, studentComment: string) => {
    const auth = await requireAuth();
    if ('error' in auth) return { error: auth.error };
    const student = auth.user;

    if (!sessionID || !planeID) {
        return { error: "Une erreur est survenue (E_00x: paramètres invalides)" };
    }

    try {
        const session = await prisma.flight_sessions.findUnique({ where: { id: sessionID } });
        if (!session || session.clubID !== student.clubID) {
            return { error: "Session introuvable ou non accessible." };
        }

        const isClassroom = planeID === CLASSROOM_SESSION_ID;
        const [club, plane, clubPlanes, conflictingSessions, holdState] = await Promise.all([
            prisma.club.findUnique({ where: { id: session.clubID } }),
            isClassroom ? null : prisma.planes.findUnique({ where: { id: planeID } }),
            prisma.planes.findMany({ where: { clubID: session.clubID }, select: { id: true, ownerID: true } }),
            // Student or plane already taken at the same time.
            prisma.flight_sessions.findMany({
                where: {
                    sessionDateStart: session.sessionDateStart,
                    id: { not: session.id },
                    OR: [
                        { studentID: student.id },
                        { studentPlaneID: planeID },
                    ],
                },
                select: { id: true },
            }),
            resolveBaptemeHold(session.id),
        ]);
        if (!club) return { error: "Session introuvable ou non accessible." };

        const check = checkStudentRegistration({
            user: student,
            club,
            session,
            planeID,
            plane,
            clubPlanes,
            now: toClubWallClock(new Date()),
            hasConflict: conflictingSessions.length > 0,
            heldByBapteme: holdState.held,
        });
        if (!check.ok) return { error: check.error };

        // Wallet (AER-66): a student / pilot with a zero or negative balance can no
        // longer book. Club and balance are re-read from the DB for the SIGNED-IN user
        // (never the objects sent by the client).
        const walletBlock = await checkWalletBooking(student);
        if (walletBlock) return { error: walletBlock, code: "WALLET_EMPTY" as const };

        // Conditional write: if someone took the slot between the read and the write,
        // nothing is changed.
        const updated = await prisma.flight_sessions.updateMany({
            where: { id: session.id, studentID: null },
            data: {
                studentID: student.id,
                studentPlaneID: planeID,
                studentFirstName: student.firstName,
                studentLastName: student.lastName,
                studentComment: studentComment,
            },
        });
        if (updated.count !== 1) return { error: "Ce créneau est déjà réservé." };

        return { success: "Étudiant inscrit avec succès à la session." };

    } catch {
        return { error: "Une erreur est survenue lors de l'inscription de l'étudiant." };
    }

};

/**
 * Slot notes. Only the slot ID comes from the client: the session is re-read from
 * the DB, and each party only edits their own note (management: both), see
 * resolveCommentUpdate (AER-67).
 */
export const updateCommentSession = async (sessionID: string, pilotComment: string, studentComment: string) => {
    if (!sessionID) {
        return { error: "Une erreur est survenue (E_001: session is undefined)" };
    }

    const auth = await requireAuth();
    if ('error' in auth) return { error: auth.error };

    try {
        const session = await prisma.flight_sessions.findUnique({ where: { id: sessionID } });
        if (!session) return { error: "Permissions insuffisantes" };

        const update = resolveCommentUpdate({ user: auth.user, session, pilotComment, studentComment });
        if (!update.ok) return { error: update.error };

        await prisma.flight_sessions.update({
            where: { id: session.id },
            data: update.data,
        });

        return { success: "Les notes ont été mises à jour avec succès !" };
    } catch {
        return { error: "Erreur lors de la mise à jour des commentaires" };
    }
};
