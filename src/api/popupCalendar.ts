"use client";

import { flight_sessions, planes, User, userRole } from "@prisma/client";
import { resolveOfferedPlaneIDs } from "@/lib/planeVisibility";


interface Obj {
    pilotes: User[];
    planes: planes[];
}

export const filterPilotePlane = async (
    sessions: flight_sessions[],
    users: User[],
    planes: planes[]
): Promise<Obj> => {
    if (sessions.length === 0) {
        return { pilotes: [], planes: [] };
    }

    // Available sessions (no student assigned)
    const availableSessions = sessions.filter(session => session.studentID === null);

    const uniquePilotIDs = Array.from(new Set(availableSessions.map(session => session.pilotID)));
    const uniquePlaneIDs = Array.from(new Set(
        availableSessions.flatMap(session => resolveOfferedPlaneIDs(session.planeID, planes))
    ));

    const studentPlaneIDs = sessions
        .filter(session => session.studentPlaneID !== null)
        .map(session => session.studentPlaneID);

    const pilotes = users.filter(user => uniquePilotIDs.includes(user.id));

    // Keep the planes of the available sessions, excluding those assigned to students
    const filteredPlanes = planes.filter(
        plane => uniquePlaneIDs.includes(plane.id) && !studentPlaneIDs.includes(plane.id)
    );

    return { 
        pilotes,
        planes: filteredPlanes
    };
};

export const getFreePlanesUsers = (
    actualSession: flight_sessions,
    sessions: flight_sessions[],
    usersProp: User[],
    planesProp: planes[]
) => {
    if (!Array.isArray(usersProp) || !Array.isArray(planesProp)) {
        return { students: [], planes: [] };
    }

    // Sessions starting at the same time as the current one
    const sessionsFiltered = sessions.filter(
        session => session.sessionDateStart.toISOString() === actualSession.sessionDateStart.toISOString()
    );

    // Students and planes already used in those sessions
    const usedStudentIDs = sessionsFiltered
        .map(session => session.studentID)
        .filter((id): id is string => id !== null);

    const usedStudentPlaneIDs = sessionsFiltered
        .map(session => session.studentPlaneID)
        .filter((id): id is string => id !== null);

    // Exclude "admin" users, keep available students
    const students = usersProp.filter(
        user => user.role !== userRole.ADMIN && user.role !== userRole.MANAGER && !usedStudentIDs.includes(user.id)
    );

    const offeredPlaneIDs = resolveOfferedPlaneIDs(actualSession.planeID, planesProp);
    const freePlanes = planesProp.filter(plane => !usedStudentPlaneIDs.includes(plane.id) && offeredPlaneIDs.includes(plane.id));

    return { students, planes: freePlanes };
};
