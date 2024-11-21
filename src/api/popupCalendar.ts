"use server"

import { flight_sessions } from "@prisma/client"

interface Obj {
    pilotes: string[];
    planes: string[];
}

export const filterPilotePlane = async (sessions: flight_sessions[]): Promise<Obj> => {
    if (sessions.length === 0) {
        return { pilotes: [], planes: [] };
    }

    if (sessions.length === 1) {
        return { 
            pilotes: [sessions[0].pilotFirstName], 
            planes: sessions[0].planeID 
        };
    }

    const pilotes = sessions.map(session => session.pilotFirstName);
    const planes = sessions.map(session => session.planeID);

    return { 
        pilotes: Array.from(new Set(pilotes)), 
        planes: Array.from(new Set(planes.flat()))
    };
};
