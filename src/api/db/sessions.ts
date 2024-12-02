"use server";

import { PrismaClient, User } from '@prisma/client';
import { differenceInHours, isBefore } from 'date-fns';
import { sendStudentNotificationBooking, sendNotificationBooking, sendNotificationRemoveAppointment, sendNotificationSudentRemoveForPilot } from "@/lib/mail";

const prisma = new PrismaClient();
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

export const newSession = async (sessionData: interfaceSessions, user: User) => {
    if (!sessionData) {
        return { error: "Une erreur est survenue (E_001: sessionData is undefined)" };
    }

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
            clubID: user.clubID,
            pilotID: user.id,
            sessionDateStart: { in: sessionsToCreate },
        }
    });
    prisma.$disconnect();

    if (existingSessions.length > 0) {
        return { error: "Une session existe déjà avec cette configuration pour l'une des dates." };
    }

    // Envoi des sessions à la base de données avec Prisma en une seule transaction
    try {
        const createdSessions = await prisma.$transaction(
            sessionsToCreate.map(sessionDateStart =>
                prisma.flight_sessions.create({
                    data: {
                        clubID: user.clubID,
                        sessionDateStart,
                        sessionDateDuration_min: sessionData.duration,
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
        prisma.$disconnect();

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
        prisma.$disconnect();
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
        prisma.$disconnect();
        return sessions;
    } catch (error) {
        console.error('Error getting flight sessions:', error);
        return { error: "Erreur lors de la récupération des sessions de vol" };
    }

};

export const getPlanes = async (clubID: string) => {
    const prisma = new PrismaClient()
    try {
        const planes = await prisma.planes.findMany({
            where: {
                clubID: clubID
            }
        })
        prisma.$disconnect();
        return planes;
    } catch (error) {
        console.error('Error getting planes:', error);
        return { error: "Erreur lors de la récupération des avions" };
    }

};

export const removeSessionsByID = async (sessionIDs: string[]) => {
    try {
        // Récupérer les sessions avec les studentID associés
        const sessions = await prisma.flight_sessions.findMany({
            where: {
                id: { in: sessionIDs },
            },
        });
        prisma.$disconnect();


        // Récupérer les étudiants associés via leur ID
        const studentIDs = sessions
            .map((session) => session.studentID)
            .filter((id): id is string => id !== null);
        const students = await prisma.user.findMany({
            where: {
                id: { in: studentIDs },
            },
        });
        prisma.$disconnect();

        const piloteIDs = sessions.map((session) => session.pilotID).filter((id): id is string => id !== null);
        const pilotes = await prisma.user.findMany({
            where: {
                id: { in: piloteIDs },
            },
        });
        prisma.$disconnect();

        const piloteMap = new Map(pilotes.map((pilot) => [pilot.id, pilot.email]));

        // Créer une map pour accéder facilement aux étudiants par leur ID
        const studentMap = new Map(students.map((student) => [student.id, student.email]));

        // Envoyer une notification pour chaque session
        for (const session of sessions) {
            const studentEmail = studentMap.get(session.studentID || '');
            const piloteEmail = piloteMap.get(session.pilotID || '');
            const endDate = new Date(session.sessionDateStart);
            endDate.setUTCMinutes(endDate.getUTCMinutes() + session.sessionDateDuration_min);

            if (studentEmail) {
                sendNotificationRemoveAppointment(studentEmail, session.sessionDateStart, endDate);
                sendNotificationSudentRemoveForPilot(piloteEmail as string, session.sessionDateStart as Date, endDate as Date);
            }
        }

        // Supprimer les sessions après notification
        await prisma.flight_sessions.deleteMany({
            where: {
                id: { in: sessionIDs },
            },
        });
        prisma.$disconnect();

        return { success: "Les sessions ont été supprimées !" };
    } catch (error) {
        console.error('Error deleting flight sessions:', error);
        return { error: "Erreur lors de la suppression des sessions de vol" };
    }
};

export const removeStudentFromSessionID = async (sessionID: string) => {
    try {
        // Récupérer les informations de la session
        const session = await prisma.flight_sessions.findUnique({
            where: { id: sessionID },
        });
        prisma.$disconnect();

        if (!session || !session.sessionDateStart || !session.studentID || !session.pilotID) {
            return { error: "Session introuvable ou incomplète." };
        }

        const student = await prisma.user.findUnique({
            where: { id: session.studentID }
        })
        prisma.$disconnect();

        const pilote = await prisma.user.findUnique({
            where: { id: session.pilotID }
        })
        prisma.$disconnect();


        const sessionDateUTC = new Date(session.sessionDateStart); // Assurez-vous que cette date est UTC

        // Vérifier si la date de la session est dans le futur et à plus de 3 heures de l'heure actuelle
        const nowUTC = new Date(); // Date actuelle en UTC
        const hoursUntilSession = differenceInHours(sessionDateUTC, nowUTC);

        if (isBefore(sessionDateUTC, nowUTC) || hoursUntilSession < 3) {
            return { error: "La session ne peut être modifiée que si elle est dans plus de 3 heures." };
        }

        // Mettre à jour la session en supprimant les informations de l'élève
        await prisma.flight_sessions.update({
            where: {
                id: sessionID
            },
            data: {
                studentID: null,
                studentFirstName: null,
                studentLastName: null,
                student_type: null,
                studentPlaneID: null,
            }
        });
        prisma.$disconnect();

        const endDate = new Date(session.sessionDateStart);
        endDate.setUTCMinutes(endDate.getUTCMinutes() + session.sessionDateDuration_min);

        sendNotificationRemoveAppointment(student?.email as string, session.sessionDateStart as Date, endDate as Date);
        sendNotificationSudentRemoveForPilot(pilote?.email as string, session.sessionDateStart as Date, endDate as Date);
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
        prisma.$disconnect();

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
        prisma.$disconnect();

        return planes; // Retourne le tableau d'avions avec `id` et `name`
    } catch (error) {
        console.error('Error getting session planes:', error);
        return [];
    }
};

export const studentRegistration = async (sessionID: string, studentID: string, planeID: string) => {
    if (!sessionID || !studentID || !planeID) {
        return { error: "Une erreur est survenue (E_00x: paramètres invalides)" };
    }

    try {
        // Charger les données nécessaires en une seule requête
        const [student, session, conflictingSessions] = await Promise.all([
            prisma.user.findUnique({
                where: { id: studentID },
            }),
            prisma.flight_sessions.findUnique({
                where: { id: sessionID },
            }),
            prisma.flight_sessions.findMany({
                where: {
                    clubID: studentID ? undefined : undefined, // Placeholder for better filtering
                    sessionDateStart: sessionID ? undefined : undefined, // Placeholder for more 
                },
            }),
            
        ]);
        prisma.$disconnect();

        const instructor = await prisma.user.findUnique({
            where: { id: session?.pilotID }
        })
        prisma.$disconnect();

        if (!student) {
            return { error: "Élève introuvable." };
        }

        if (!session || session.clubID !== student.clubID) {
            return { error: "Session introuvable ou non accessible." };
        }

        // Vérification 0 : la date de la session doit être dans le futur
        if (session.sessionDateStart < new Date()) {
            return { error: "La date de la session est passée." };
        }

        // Vérification 1 : restrictions sur l'utilisateur
        if (student.restricted) {
            return { error: "Contacter l'administrateur pour plus d'informations. (E_002: restricted)" };
        }

        // Vérification 2 : rôle de l'utilisateur
        const allowedRoles = ["STUDENT", "PILOT", "OWNER", "ADMIN", "INSTRUCTOR"];
        if (!allowedRoles.includes(student.role)) {
            return { error: "Vous n'avez pas les droits pour vous inscrire à une session. (E_003: User)" };
        }

        // Vérification 3 et 4 : Conflits avec d'autres sessions
        const conflictingSession = conflictingSessions.find((s) =>
            (s.studentID === studentID || s.studentPlaneID === planeID) &&
            s.sessionDateStart.getTime() === session.sessionDateStart.getTime()
        );

        if (conflictingSession) {
            return { error: "Conflit détecté avec une autre session (élève ou avion)." };
        }

        // Inscrire l'étudiant à la session
        await prisma.flight_sessions.update({
            where: { id: sessionID },
            data: {
                studentID: studentID,
                studentPlaneID: planeID,
                studentFirstName: student.firstName,
                studentLastName: student.lastName,
            },
        });
        prisma.$disconnect();

        const endDate = new Date(session.sessionDateStart)
        endDate.setUTCMinutes(endDate.getUTCMinutes() + session.sessionDateDuration_min)

        await sendNotificationBooking(instructor?.email as string, instructor?.firstName as string, instructor?.lastName as string, session.sessionDateStart as Date, endDate as Date);
        await sendStudentNotificationBooking(student.email as string, session.sessionDateStart as Date, endDate as Date);

        return { success: "Étudiant inscrit avec succès à la session." };
    } catch (error) {
        console.error("Erreur lors de l'inscription de l'étudiant :", error);
        return { error: "Une erreur est survenue lors de l'inscription de l'étudiant." };
    }
};
