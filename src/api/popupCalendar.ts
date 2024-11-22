"use server";

import { flight_sessions, planes, PrismaClient, User } from "@prisma/client";

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

    // Cas avec une seule session
    if (sessions.length === 1) {
        const pilotesTab: User[] = [];
        const planesTab: planes[] = [];

        // Récupérer le pilote
        const pilot = await prisma.user.findUnique({ where: { id: sessions[0].pilotID } });
        if (pilot) pilotesTab.push(pilot);

        // Récupérer les détails des avions
        for (let i = 0; i < sessions[0].planeID.length; i++) {
            const plane = await prisma.planes.findUnique({ where: { id: sessions[0].planeID[i] } });
            if (plane) {
                planesTab.push(plane);
            }
        }

        return { 
            pilotes: pilotesTab, 
            planes: planesTab 
        };
    }

    // Cas avec plusieurs sessions : récupérer les pilotes et les avions en détail
    const uniquePilotIDs = Array.from(new Set(sessions.map(session => session.pilotID)));
    const uniquePlaneIDs = Array.from(new Set(sessions.flatMap(session => session.planeID)));

    // Récupérer les pilotes uniques
    const pilotes = (await Promise.all(
        uniquePilotIDs.map(async (id) => {
            return await prisma.user.findUnique({ where: { id } });
        })
    )).filter((pilot): pilot is User => pilot !== null); // Filtrer les pilotes non nuls

    // Récupérer les avions uniques
    const planes = (await Promise.all(
        uniquePlaneIDs.map(async (id) => {
            return await prisma.planes.findUnique({ where: { id } });
        })
    )).filter((plane): plane is planes => plane !== null); // Filtrer les avions non nuls

    return { 
        pilotes, // Les pilotes uniques sans valeur null
        planes   // Les avions uniques sans valeur null
    };
};
