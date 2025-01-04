"use server";

import { Club, flight_sessions, User, userRole } from '@prisma/client';
import { differenceInMinutes, isBefore } from 'date-fns';
import prisma from '../prisma';
import { convertMinutesToHours } from '../global function/dateServeur';

export interface interfaceSessions {
    date: Date | undefined;
    startHour: string;
    startMinute: string;
    endHour: string;
    endMinute: string;
    duration: number;
    endReccurence: Date | undefined;
    planeId: string[];
}

export const checkSessionDate = async (sessionData: interfaceSessions, user: User) => {
    if (!sessionData.date) {
        return { error: "La date de la session est obligatoire" };
    }

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
        return { error: "Veuillez sélectionner des appareils ou définir la session comme une session en salle" }
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

export const newSession = async (sessionData: interfaceSessions, user: User) => {
    if (!sessionData.date) {
        return { error: "La date de la session est obligatoire" };
    }

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
        const batchSize = 100; // Par exemple, limiter à 100 insertions par batch
        const createdSessions = [];
        for (let i = 0; i < sessionsToCreate.length; i += batchSize) {
            const batch = sessionsToCreate.slice(i, i + batchSize);
            const result = await prisma.$transaction(
                batch.map(session =>
                    prisma.flight_sessions.create({
                        data: {
                            clubID: user.clubID as string,
                            sessionDateStart: session.sessionDateStart,
                            sessionDateDuration_min: session.sessionDateDuration_min,
                            finalReccurence: sessionData.endReccurence,
                            pilotID: user.id,
                            pilotFirstName: user.firstName,
                            pilotLastName: user.lastName,
                            studentID: null,
                            studentFirstName: null,
                            studentLastName: null,
                            student_type: null,
                            planeID: sessionData.planeId,
                        }
                    })
                )
            );
            createdSessions.push(...result);
        }

        return { success: "Les sessions ont été créées !", sessions: createdSessions };
    } catch (error) {
        console.error('Error creating flight sessions:', error);
        return { error: "Erreur lors de la création des sessions de vol" };
    }
};



export const getAllSessions = async (clubID: string, monthSelected: Date) => {

    try {
        const sessions = await prisma.flight_sessions.findMany({
            where: {
                clubID: clubID,
                sessionDateStart: {
                    gte: new Date(monthSelected.getFullYear(), monthSelected.getMonth(), 1, 0, 0, 0, 0),
                    lte: new Date(monthSelected.getFullYear(), monthSelected.getMonth() + 1, 0, 23, 59, 59, 999)
                },
            },
        });

        return sessions;
    } catch (error) {
        console.error('Error getting flight sessions:', error);
        return { error: "Erreur lors de la récupération des sessions de vol" };
    }

};

export const getAllFutureSessions = async (clubID: string) => {
    try {
        const sessions = await prisma.flight_sessions.findMany({
            where: {
                clubID: clubID,
                sessionDateStart: {
                    gte: new Date()
                }
            }
        })

        return sessions;
    } catch (error) {
        console.error('Error getting flight sessions:', error);
        return { error: "Erreur lors de la récupération des sessions de vol" };
    }

};

export const getPlanes = async (clubID: string) => {
    try {
        const planes = await prisma.planes.findMany({
            where: {
                clubID: clubID
            }
        })

        return planes;
    } catch (error) {
        console.error('Error getting planes:', error);
        return { error: "Erreur lors de la récupération des avions" };
    }

};

export const removeSessionsByID = async (sessionIDs: string[]) => {
    try {
        // Supprimer les sessions après récupération des informations
        await prisma.flight_sessions.deleteMany({
            where: {
                id: { in: sessionIDs },
            },
        });



        return { success: "Les sessions ont été supprimées !" };
    } catch (error) {
        console.error('Error deleting flight sessions:', error);
        return { error: "Erreur lors de la suppression des sessions de vol" };
    }
};

export const removeStudentFromSessionID = async (session: flight_sessions, timeZoneOffset: number, club: Club, user: User) => {
    try {
        // Validation précoce 
        if (!session || !session.sessionDateStart || !session.studentID || !session.pilotID) {
            return { error: "Session introuvable ou incomplète." };
        }

        const nowUTC = new Date();
        nowUTC.setMinutes(nowUTC.getMinutes() - timeZoneOffset);

        const minutesUntilSession = differenceInMinutes(session.sessionDateStart, nowUTC);

        const allowedRoles: userRole[] = [userRole.ADMIN, userRole.INSTRUCTOR, userRole.OWNER];

        if(!allowedRoles.includes(user.role) && !club.userCanUnsubscribe) {
            return { error: "Les inscriptions sont désactivées par le club, se raprocher de l'administrateur du club." };
        }
        if (
            !allowedRoles.includes(user.role) &&
            (isBefore(session.sessionDateStart, nowUTC) || minutesUntilSession < club.timeDelayUnsubscribeminutes)
        ) {
            return { error: `La session ne peut être modifiée que si elle est dans plus de ${convertMinutesToHours(club.timeDelayUnsubscribeminutes)}` };
        }



        // Mettre à jour la session en une seule requête
        await prisma.flight_sessions.update({
            where: { id: session.id },
            data: {
                studentID: null,
                studentFirstName: null,
                studentLastName: null,
                student_type: null,
                studentPlaneID: null,
            }
        });

        return { success: "L'élève a été désinscrit de la session !" };
    } catch (error) {
        console.error('Error deleting flight session:', error);
        return { error: "Erreur lors de la suppression de la session de vol" };
    }
};

export const getSessionPlanes = async (sessionID: string) => {
    try {
        // Récupère la session pour obtenir les IDs des avions
        const session = await prisma.flight_sessions.findUnique({
            where: {
                id: sessionID
            },
        });


        // Si aucun planeID n'est trouvé, retourne un tableau vide
        if (!session?.planeID || session.planeID.length === 0) {
            return [];
        }

        // Recherche des informations sur les avions dans la table `planes` pour chaque ID dans `planeID`
        const planes = await prisma.planes.findMany({
            where: {
                id: {
                    in: session.planeID // Utilise `in` pour rechercher tous les avions correspondant aux IDs dans le tableau
                },
                operational: true // Ajoute la condition pour que seuls les avions opérationnels soient récupérés
            },
            select: {
                id: true,
                name: true
            }
        });


        return planes; // Retourne le tableau d'avions avec `id` et `name`
    } catch (error) {
        console.error('Error getting session planes:', error);
        return [];
    }
};

export const studentRegistration = async (session: flight_sessions, student: User, planeID: string, club: Club, localTimeOffset: number) => {
    if (!session || !student || !planeID || !club) {
        return { error: "Une erreur est survenue (E_00x: paramètres invalides)" };
    }

    if (club.userCanSubscribe === false) {
        return { error: "Les inscriptions sont désactivées par le club, se raprocher de l'administrateur du club." };
    }

    try {
        // Étape 1 : Charger les données critiques
        const [conflictingSessions] = await Promise.all([
            prisma.flight_sessions.findMany({
                where: {
                    OR: [
                        { studentID: student.id },
                        { studentPlaneID: planeID },
                    ],
                },
                select: {
                    studentID: true,
                    studentPlaneID: true,
                    sessionDateStart: true,
                },
            }),
        ]);

        // Vérifications critiques
        if (!student) {
            return { error: "Élève introuvable." };
        }

        if (!session || session.clubID !== student.clubID) {
            return { error: "Session introuvable ou non accessible." };
        }

        const sessionDate = session.sessionDateStart;
        const now = new Date();
        now.setMinutes(now.getMinutes() - localTimeOffset + session.sessionDateDuration_min);

        if (sessionDate < now) {
            return { error: `La date de la session est passée ou trop proche, la session doit être dans ${convertMinutesToHours(session.sessionDateDuration_min)}` };
        }


        if (student.restricted) {
            return { error: "Contacter l'administrateur pour plus d'informations. (E_002: restricted)" };
        }

        const allowedRoles = ["STUDENT", "PILOT", "OWNER", "ADMIN", "INSTRUCTOR"];
        if (!allowedRoles.includes(student.role)) {
            return { error: "Vous n'avez pas les droits pour vous inscrire à une session. (E_003: User)" };
        }

        const conflictingSession = conflictingSessions.find((s) =>
            s.sessionDateStart.getTime() === session.sessionDateStart.getTime()
        );
        if (conflictingSession) {
            return { error: "Conflit détecté avec une autre session (élève ou avion)." };
        }

        // Étape 2 : Mise à jour rapide de la session
        if (student) {

            await prisma.flight_sessions.update({
                where: { id: session.id },
                data: {
                    studentID: student.id,
                    studentPlaneID: planeID,
                    studentFirstName: student.firstName,
                    studentLastName: student.lastName,
                }})            
        }

        // Retour rapide de succès
        return { success: "Étudiant inscrit avec succès à la session." };

    } catch (error) {
        console.error("Erreur lors de l'inscription de l'étudiant :", error);
        return { error: "Une erreur est survenue lors de l'inscription de l'étudiant." };
    }

};

export const getHoursByMonth = async (clubID: string) => {
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
