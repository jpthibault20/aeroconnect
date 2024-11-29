"use server";

import { flight_sessions, planes, PrismaClient, User } from "@prisma/client";
import { Session } from "inspector/promises";
import { getAllUser } from "./db/users";
import { getPlanes } from "./db/planes";

const prisma = new PrismaClient();

interface Obj {
    pilotes: User[];
    planes: planes[];
}

export const filterPilotePlane = async (sessions: flight_sessions[]): Promise<Obj> => {
    // Cas où il n'y a pas de sessions
    if (sessions.length === 0) {
        return { pilotes: [], planes: [] };
    }

    const availableSessions = sessions.filter(session => session.studentID === null);

    // Récupérer les IDs uniques des pilotes et des avions
    const uniquePilotIDs = Array.from(new Set(availableSessions.map(session => session.pilotID)));
    const uniquePlaneIDs = Array.from(new Set(availableSessions.flatMap(session => session.planeID)));

    // Récupérer les IDs des avions associés à un étudiant
    const studentPlaneIDs = sessions
        .filter(session => session.studentPlaneID !== null)
        .map(session => session.studentPlaneID);

    // Récupérer les pilotes uniques
    const pilotes = (await Promise.all(
        uniquePilotIDs.map(async (id) => {
            return await prisma.user.findUnique({ where: { id } });
        })
    )).filter((pilot): pilot is User => pilot !== null); // Filtrer les pilotes non nuls

    // Récupérer les avions uniques et filtrer ceux présents dans studentPlaneIDs
    const planes = (await Promise.all(
        uniquePlaneIDs.map(async (id) => {
            return await prisma.planes.findUnique({ where: { id } });
        })
    )).filter(
        (plane): plane is planes => plane !== null && !studentPlaneIDs.includes(plane.id)
    );

    return { 
        pilotes, // Les pilotes uniques sans valeur null
        planes   // Les avions uniques sans valeur null et non assignés aux étudiants
    };
};

export const getFreePlanesUsers = async (actualSession: flight_sessions, sessions: flight_sessions[]) => {

    // Récupérer les utilisateurs et gérer les erreurs possibles
    const usersResult = await getAllUser(actualSession.clubID);
    if (!Array.isArray(usersResult)) {
        console.error('Erreur lors de la récupération des utilisateurs :', usersResult.error || 'Erreur inconnue');
        return { pilotes: [], planes: [] };
    }
    const users: User[] = usersResult;

    // Récupérer les avions et gérer les erreurs possibles
    const planesResult = await getPlanes(actualSession.clubID);
    if (!Array.isArray(planesResult)) {
        console.error('Erreur lors de la récupération des avions :', planesResult.error || 'Erreur inconnue');
        return { students: [], planes: [] };
    }
    const planes: planes[] = planesResult;

    // Filtrer les sessions ayant la même date de début que la session actuelle
    const sessionsFiltered = sessions.filter(
        session => session.sessionDateStart.toISOString() === actualSession.sessionDateStart.toISOString()
    );

    // Extraire les IDs des étudiants et des avions déjà utilisés dans les sessions filtrées
    const usedStudentIDs = sessionsFiltered
        .map(session => session.studentID)
        .filter((id): id is string => id !== null); // Filtrer les null
    const usedStudentPlaneIDs = sessionsFiltered
        .map(session => session.studentPlaneID)
        .filter((id): id is string => id !== null); // Filtrer les null

    // Filtrer les students disponibles
    const students = users.filter(user => !usedStudentIDs.includes(user.id));

    // Filtrer les avions disponibles
    const freePlanes = planes.filter(plane => !usedStudentPlaneIDs.includes(plane.id));

    return { students, planes: freePlanes };
};