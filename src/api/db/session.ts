"use server";

import { PrismaClient, User } from '@prisma/client';

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

    if (new Date(sessionData.date.getFullYear(), sessionData.date.getMonth(), sessionData.date.getDate()) <= new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        return { error: "La date de session doit être dans le futur" };
    }

    // if (sessionData.date.toUTCString().slice(0, 16) === now.toUTCString().slice(0, 16)) {
    //     const startHour = Number(sessionData.startHour);
    //     const startMinute = Number(sessionData.startMinute);
    //     const startTimeMinute = startHour * 60 + startMinute + now.getTimezoneOffset();
    //     console.log(startHour, startMinute, now.getUTCHours(), now.getUTCMinutes());
    //     if (startTimeMinute <= (now.getUTCHours() * 60 + now.getUTCMinutes())) {
    //         return { error: "La session est aujourd'hui mais l'heure doit être dans le futur" };
    //     }
    // }

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

    if (existingSessions.length > 0) {
        return { error: "Une session existe déjà avec cette configuration pour l'une des dates." };
    }

    // Envoi des sessions à la base de données avec Prisma en une seule transaction
    try {
        await prisma.$transaction(
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
        console.log('Sessions created successfully');
        return { success: "Les sessions ont été créées !" };
    } catch (error) {
        console.error('Error creating flight sessions:', error);
        return { error: "Erreur lors de la création des sessions de vol" };
    } finally {
        await prisma.$disconnect();
    }
};

export const getAllSessions = async (clubID: string) => {
    try {
        const sessions = await prisma.flight_sessions.findMany({
            where: {
                clubID: clubID,
            }
        });
        return sessions;
    } catch (error) {
        console.error('Error getting flight sessions:', error);
        return { error: "Erreur lors de la récupération des sessions de vol" };
    }
    finally {
        await prisma.$disconnect();
    }
}

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
    finally {
        await prisma.$disconnect();
    }
}

export const getPlanes = async (clubID: string) => {
    const prisma = new PrismaClient()
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
    finally {
        await prisma.$disconnect();
    }
}

export const removeSessionsByID = async (sessionID: string[]) => {
    try {
        await prisma.flight_sessions.deleteMany({
            where: {
                id: {
                    in: sessionID
                }
            }
        });
        console.log('Sessions deleted successfully');
        return { success: "Les sessions ont été supprimées !" };
    } catch (error) {
        console.error('Error deleting flight sessions:', error);
        return { error: "Erreur lors de la suppression des sessions de vol" };
    } finally {
        await prisma.$disconnect();
    }
}