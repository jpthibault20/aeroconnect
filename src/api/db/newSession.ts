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
    // Vérifier si les données de session sont définies
    if (!sessionData) {
        return { error: "Une erreur est survenue (E_001: sessionData is undefined)" };
    }

    // Vérifier si la date de session est fournie
    if (!sessionData.date) {
        return { error: "La date de la session est obligatoire" };
    }

    // Vérifier si la date est dans le futur
    const now = new Date();
    if (sessionData.date < now) {
        return { error: "La date de session doit être dans le futur" };
    }

    // Vérifier si l'heure de début est dans le futur si la date est aujourd'hui
    if (sessionData.date.toDateString() === now.toDateString()) {
        const startHour = Number(sessionData.startHour);
        const startMinute = Number(sessionData.startMinute);
        if (startHour < now.getHours() || (startHour === now.getHours() && startMinute <= now.getMinutes())) {
            return { error: "La session est aujourd'hui mais l'heure doit être dans le futur" };
        }
    }

    const débutTotalMinutes = parseInt(sessionData.startHour) * 60 + parseInt(sessionData.startMinute);
    const finTotalMinutes = parseInt(sessionData.endHour) * 60 + parseInt(sessionData.endMinute);

    // Vérifier si l'heure de début est avant l'heure de fin
    if (débutTotalMinutes >= finTotalMinutes) {
        return { error: "L'heure de fin doit être après l'heure de début" };
    }

    // Vérifier la durée de la session
    const différenceMinutes = finTotalMinutes - débutTotalMinutes;
    if (différenceMinutes < sessionData.duration) {
        return { error: `La durée de la session doit être supérieure à ${sessionData.duration} minutes` };
    }
    if (différenceMinutes % sessionData.duration !== 0) {
        return { error: `La durée de la session doit être un multiple de ${sessionData.duration} minutes` };
    }

    // Vérifier les règles de récurrence
    if (sessionData.endReccurence && sessionData.endReccurence <= sessionData.date) {
        return { error: "La date de fin de récurrence doit être après la date de début" };
    }

    // Préparer les dates pour la création de la session
    const baseSessionDateStart = new Date(sessionData.date);
    baseSessionDateStart.setHours(Number(sessionData.startHour), Number(sessionData.startMinute), 0);

    const sessionsToCreate = [];
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
    const dateEndSession = new Date(baseSessionDateStart.getFullYear(), baseSessionDateStart.getMonth(), baseSessionDateStart.getDate(), Number(sessionData.endHour), Number(sessionData.endMinute), 0);

    // Créer des sessions hebdomadaires jusqu'à la date de fin
    if (sessionData.endReccurence) {
        sessionData.endReccurence.setDate(sessionData.endReccurence.getDate() + 1);
        for (let current = baseSessionDateStart; current <= sessionData.endReccurence; current = new Date(current.getTime() + oneWeekInMs)) {
            const sartCurrent = new Date(current.getFullYear(), current.getMonth(), current.getDate(), Number(sessionData.startHour), Number(sessionData.startMinute), 0);
            const endCurrent = new Date(current.getFullYear(), current.getMonth(), current.getDate(), Number(sessionData.endHour), Number(sessionData.endMinute), 0);
            while (sartCurrent.getTime() < endCurrent.getTime()) {
                sessionsToCreate.push(new Date(sartCurrent));
                sartCurrent.setMinutes(sartCurrent.getMinutes() + sessionData.duration);
            }
        }
    }
    else {
        while (baseSessionDateStart.getTime() < dateEndSession.getTime()) {
            sessionsToCreate.push(new Date(baseSessionDateStart));
            baseSessionDateStart.setMinutes(baseSessionDateStart.getMinutes() + sessionData.duration);
        }
    }

    // Vérifier les conflits pour chaque session à créer
    for (const sessionDateStart of sessionsToCreate) {
        const existingSession = await prisma.flight_sessions.findFirst({
            where: {
                clubID: user.clubID,
                pilotID: user.id,
                sessionDateStart,
            }
        });

        if (existingSession) {
            return { error: "Une session existe déjà avec cette configuration pour l'une des dates." };
        }
    }

    // Envoi des sessions à la base de données avec Prisma
    try {
        for (const sessionDateStart of sessionsToCreate) {
            await prisma.flight_sessions.create({
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
            });
        }
        console.log('Sessions created successfully');
        return { success: "Les sessions ont été créées !" };
    } catch (error) {
        console.error('Error creating flight sessions:', error);
        return { error: "Erreur lors de la création des sessions de vol" };
    } finally {
        await prisma.$disconnect();
    }
};
