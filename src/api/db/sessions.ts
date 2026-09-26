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

// Message de blocage si l'utilisateur (STUDENT / PILOT) a un solde ≤ 0 dans un
// club dont le portefeuille est activé ; null sinon.
async function checkWalletBooking(user: User): Promise<string | null> {
    if (!user.clubID || !isBookingGatedRole(user.role)) return null;
    const club = await prisma.club.findUnique({ where: { id: user.clubID } });
    if (!club?.walletEnabled) return null;
    const wallet = await prisma.wallet.findUnique({
        where: { clubID_userID: { clubID: club.id, userID: user.id } },
        select: { balanceCents: true },
    });
    // Décision pure et testée (cf. bookingWalletBlock dans src/lib/wallet.ts).
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
    // Types de vol du créneau (sélection multiple). DISCOVERY marque un créneau
    // baptême, exposé au public via le lien de réservation.
    natureOfTheft: NatureOfTheft[];
}

export const checkSessionDate = async (sessionData: interfaceSessions, instructorInput: Pick<User, "id"> | undefined) => {
    if (!sessionData.date) {
        return { error: "La date de la session est obligatoire" };
    }

    if (!instructorInput) {
        return { error: "L'instructeur est obligatoire" };
    }

    // Seul l'identifiant de l'instructeur vient du client : il est relu en
    // base et doit appartenir au club de l'utilisateur connecté (AER-67).
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

    // Vérifier les conflits pour chaque session à créer avec une seule requête
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

    // ADMIN/OWNER/MANAGER peuvent créer pour n'importe quel instructeur du même
    // club, les autres pour eux-mêmes. L'instructeur (nom, club) est relu en
    // base : seul son identifiant vient du client (AER-67).
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
    const sessionDurationMs = sessionData.duration * 60 * 1000; // Convertir la durée en ms
    const sessionsToCreate: { sessionDateStart: Date; sessionDateDuration_min: number }[] = [];

    if (sessionData.endReccurence) {
        // Préparer la date de fin récurrence
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
        // Calculer la date de fin pour une session unique
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
 * Désinscription d'un élève d'un créneau. Seul l'identifiant du créneau vient
 * du client : session, club et utilisateur sont relus en base (AER-67). Règles
 * dans checkStudentRemoval (src/lib/sessionRules.ts).
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
 * Inscription de l'utilisateur CONNECTÉ à un créneau. Seuls le créneau, la
 * machine et le commentaire viennent du client : utilisateur, club, créneau et
 * machine sont relus en base (AER-67). Inscrire un tiers passe par
 * addStudentToSession (gestion). Règles dans checkStudentRegistration.
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
            // Élève ou machine déjà pris au même horaire.
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

        // Portefeuille (AER-66) : un élève / pilote à solde nul ou négatif ne
        // peut plus s'inscrire. Club et solde relus en base pour l'utilisateur
        // CONNECTÉ (jamais les objets envoyés par le client).
        const walletBlock = await checkWalletBooking(student);
        if (walletBlock) return { error: walletBlock, code: "WALLET_EMPTY" as const };

        // Écriture conditionnelle : si quelqu'un a pris le créneau entre la
        // lecture et l'écriture, rien n'est modifié.
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

export const getHoursByMonth = async (clubID: string) => {
    const auth = await requireAuth(ADMIN_ROLES);
    if ('error' in auth) return [];
    if (auth.user.clubID !== clubID) return [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const sessions = await prisma.flight_sessions.findMany({
        where: {
            clubID,
            sessionDateStart: {
                gte: new Date(`${currentYear}-01-01`), // Début de l'année
                lte: now, // Date actuelle
            },
            studentID: { not: null },
        },
        select: {
            sessionDateStart: true,
            sessionDateDuration_min: true,
        },
    });

    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

    const hoursByMonth = Array.from({ length: currentMonth + 1 }, (_, monthIndex) => ({
        name: monthNames[monthIndex],
        hours: 0,
    }));

    sessions.forEach((session) => {
        const sessionDate = new Date(session.sessionDateStart!);
        const monthIndex = sessionDate.getMonth();

        if (monthIndex <= currentMonth) {
            hoursByMonth[monthIndex].hours += (session.sessionDateDuration_min || 0) / 60;
        }
    });

    return hoursByMonth;
};

export const getHoursByInstructor = async (clubID: string) => {
    const auth = await requireAuth(ADMIN_ROLES);
    if ('error' in auth) return [];
    if (auth.user.clubID !== clubID) return [];

    const currentYear = new Date().getFullYear();

    const sessions = await prisma.flight_sessions.findMany({
        where: {
            clubID,
            sessionDateStart: {
                gte: new Date(`${currentYear}-01-01`),
                lte: new Date(),
            },
            studentID: { not: null },
        },
        select: {
            pilotID: true,
            sessionDateDuration_min: true,
            pilotFirstName: true,
            pilotLastName: true,
        },
    });

    const instructorHoursMap: Record<string, { name: string; hours: number }> = {};

    sessions.forEach((session) => {
        const instructorID = session.pilotID!;
        const hours = (session.sessionDateDuration_min || 0) / 60;

        if (!instructorHoursMap[instructorID]) {
            const name = session.pilotLastName && session.pilotFirstName
                ? `${session.pilotLastName.toUpperCase().slice(0, 1)}.${session.pilotFirstName.toLowerCase().slice(0, 3)}`
                : 'Inconnu';

            instructorHoursMap[instructorID] = { name, hours: 0 };
        }

        instructorHoursMap[instructorID].hours += hours;
    });

    return Object.values(instructorHoursMap);
};

export const getHoursByPlane = async (clubID: string) => {
    const auth = await requireAuth(ADMIN_ROLES);
    if ('error' in auth) return [];
    if (auth.user.clubID !== clubID) return [];

    const currentYear = new Date().getFullYear();

    const sessions = await prisma.flight_sessions.findMany({
        where: {
            clubID,
            sessionDateStart: {
                gte: new Date(`${currentYear}-01-01`),
                lte: new Date(),
            },
            studentPlaneID: { not: null },
        },
        select: {
            studentPlaneID: true,
            sessionDateDuration_min: true,
        },
    });

    const planeHoursMap: Record<string, number> = {};

    sessions.forEach((session) => {
        const planeID = session.studentPlaneID!;
        const hours = (session.sessionDateDuration_min || 0) / 60;

        if (!planeHoursMap[planeID]) {
            planeHoursMap[planeID] = 0;
        }

        planeHoursMap[planeID] += hours;
    });

    const planes = await prisma.planes.findMany({
        where: {
            id: { in: Object.keys(planeHoursMap) },
        },
        select: { id: true, name: true },
    });

    return planes.map((plane) => ({
        name: plane.name || 'Inconnu',
        hours: planeHoursMap[plane.id] || 0,
    }));
};

export const getHoursByStudent = async (clubID: string) => {
    const auth = await requireAuth(ADMIN_ROLES);
    if ('error' in auth) return [];
    if (auth.user.clubID !== clubID) return [];

    const currentYear = new Date().getFullYear();

    const [sessions, students] = await Promise.all([
        prisma.flight_sessions.findMany({
            where: {
                clubID,
                sessionDateStart: {
                    gte: new Date(`${currentYear}-01-01`),
                    lte: new Date(),
                },
                studentID: { not: null },
            },
            select: {
                studentID: true,
                sessionDateDuration_min: true,
            },
        }),
        prisma.user.findMany({
            where: { role: 'STUDENT' },
            select: { id: true, firstName: true, lastName: true },
        }),
    ]);

    // Créer une map pour vérifier rapidement si un ID correspond à un étudiant
    const validStudentIDs = new Set(students.map((student) => student.id));

    const studentMap = students.reduce<Record<string, string>>((acc, student) => {
        acc[student.id] = `${student.lastName} ${student.firstName}`;
        return acc;
    }, {});

    const studentHoursMap: Record<string, number> = {};

    // Filtrer les sessions pour ne garder que celles des étudiants
    sessions
        .filter((session) => validStudentIDs.has(session.studentID!)) // Vérifie si l'ID est valide
        .forEach((session) => {
            const studentID = session.studentID!;
            const hours = (session.sessionDateDuration_min || 0) / 60;

            if (!studentHoursMap[studentID]) {
                studentHoursMap[studentID] = 0;
            }

            studentHoursMap[studentID] += hours;
        });

    return Object.entries(studentHoursMap).map(([studentID, hours]) => ({
        name: studentMap[studentID] || 'Inconnu',
        hours,
    }));
};

/**
 * Notes d'un créneau. Seul l'identifiant du créneau vient du client : la
 * session est relue en base, et chacun ne modifie que sa note (gestion : les
 * deux), cf. resolveCommentUpdate (AER-67).
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
