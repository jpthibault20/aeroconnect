"use server";

import { flight_logs, flightNature, pilotFunction, userRole } from "@prisma/client";
import prisma from "../prisma";
import { requireAuth } from "./users";

const LOGBOOK_ROLES: userRole[] = [
    userRole.PILOT, userRole.STUDENT, userRole.INSTRUCTOR,
    userRole.OWNER, userRole.ADMIN, userRole.MANAGER,
];
// Rôles pouvant voir/modifier les vols des autres pilotes
const MANAGEMENT_ROLES: userRole[] = [
    userRole.OWNER, userRole.ADMIN, userRole.MANAGER,
];
// Rôles pouvant modifier un vol déjà signé
const SIGN_OVERRIDE_ROLES: userRole[] = [
    userRole.OWNER, userRole.ADMIN,
];

// Date d'entrée en vigueur de l'arrêté du 17 février 2025
const REGULATION_START = new Date("2025-07-01");

export interface CreateFlightLogInput {
    clubID: string;
    sessionID?: string;
    date: Date;
    planeID?: string;
    planeRegistration: string;
    planeName: string;
    planeClass?: number;
    pilotID: string;
    pilotFirstName: string;
    pilotLastName: string;
    pilotFunction: pilotFunction;
    instructorID?: string;
    instructorFirstName?: string;
    instructorLastName?: string;
    studentID?: string;
    studentFirstName?: string;
    studentLastName?: string;
    flightNature: flightNature;
    durationMinutes: number;
    takeoffs: number;
    landings: number;
    departureAirfield?: string;
    arrivalAirfield?: string;
    hobbsStart?: number;
    hobbsEnd?: number;
    fuelAdded?: number;
    oilAdded?: number;
    anomalies?: string;
    remarks?: string;
    isManualEntry: boolean;
}

// ─── Carnet de vol pilote ───

export const getLogbookByPilot = async (pilotID: string, clubID: string, year?: number) => {
    const auth = await requireAuth(LOGBOOK_ROLES);
    if ("error" in auth) return { error: auth.error };

    // Un pilote ne voit que son carnet, sauf si owner/admin/manager
    const isManager = MANAGEMENT_ROLES.includes(auth.user.role);
    if (!isManager && auth.user.id !== pilotID) {
        return { error: "Permissions insuffisantes" };
    }
    if (auth.user.clubID !== clubID) {
        return { error: "Permissions insuffisantes" };
    }

    const currentYear = year ?? new Date().getFullYear();
    try {
        const logs = await prisma.flight_logs.findMany({
            where: {
                pilotID,
                clubID,
                date: {
                    gte: new Date(`${currentYear}-01-01`),
                    lte: new Date(`${currentYear}-12-31`),
                },
            },
            orderBy: { date: "desc" },
        });
        return { success: true, logs };
    } catch {
        return { error: "Erreur lors de la récupération du carnet de vol" };
    }
};

// ─── Carnet de route machine ───

export const getLogbookByPlane = async (planeID: string, clubID: string, year?: number) => {
    const auth = await requireAuth(LOGBOOK_ROLES);
    if ("error" in auth) return { error: auth.error };

    if (auth.user.clubID !== clubID) {
        return { error: "Permissions insuffisantes" };
    }

    const currentYear = year ?? new Date().getFullYear();
    try {
        const logs = await prisma.flight_logs.findMany({
            where: {
                planeID,
                clubID,
                date: {
                    gte: new Date(`${currentYear}-01-01`),
                    lte: new Date(`${currentYear}-12-31`),
                },
            },
            orderBy: { date: "desc" },
        });
        return { success: true, logs };
    } catch {
        return { error: "Erreur lors de la récupération du carnet de route" };
    }
};

// ─── Création manuelle ───

export const createFlightLog = async (data: CreateFlightLogInput) => {
    const auth = await requireAuth(LOGBOOK_ROLES);
    if ("error" in auth) return { error: auth.error };

    const isManager = MANAGEMENT_ROLES.includes(auth.user.role);
    if (!isManager && auth.user.id !== data.pilotID) {
        return { error: "Permissions insuffisantes" };
    }
    if (auth.user.clubID !== data.clubID) {
        return { error: "Permissions insuffisantes" };
    }

    if (!data.planeRegistration || !data.durationMinutes || !data.pilotID) {
        return { error: "Champs obligatoires manquants" };
    }

    // Calcul temps par fonction
    const timeDC = data.pilotFunction === "EP" ? data.durationMinutes : 0;
    const timePIC = data.pilotFunction === "P" ? data.durationMinutes : 0;
    const timeInstructor = data.pilotFunction === "I" ? data.durationMinutes : 0;

    try {
        const log = await prisma.flight_logs.create({
            data: {
                clubID: data.clubID,
                sessionID: data.sessionID,
                date: data.date,
                planeID: data.planeID,
                planeRegistration: data.planeRegistration,
                planeName: data.planeName,
                planeClass: data.planeClass,
                pilotID: data.pilotID,
                pilotFirstName: data.pilotFirstName,
                pilotLastName: data.pilotLastName,
                pilotFunction: data.pilotFunction,
                instructorID: data.instructorID,
                instructorFirstName: data.instructorFirstName,
                instructorLastName: data.instructorLastName,
                studentID: data.studentID,
                studentFirstName: data.studentFirstName,
                studentLastName: data.studentLastName,
                flightNature: data.flightNature,
                durationMinutes: data.durationMinutes,
                takeoffs: data.takeoffs,
                landings: data.landings,
                timeDC,
                timePIC,
                timeInstructor,
                departureAirfield: data.departureAirfield,
                arrivalAirfield: data.arrivalAirfield,
                hobbsStart: data.hobbsStart,
                hobbsEnd: data.hobbsEnd,
                fuelAdded: data.fuelAdded,
                oilAdded: data.oilAdded,
                anomalies: data.anomalies,
                remarks: data.remarks,
                isManualEntry: data.isManualEntry,
            },
        });

        // Mise à jour hobbsTotal sur l'avion si hobbsEnd renseigné
        if (data.planeID && data.hobbsEnd) {
            await prisma.planes.update({
                where: { id: data.planeID },
                data: { hobbsTotal: data.hobbsEnd },
            });
        }

        return { success: "Entrée de carnet créée avec succès", log };
    } catch {
        return { error: "Erreur lors de la création de l'entrée" };
    }
};

// ─── Modification ───

export const updateFlightLog = async (logID: string, data: Partial<CreateFlightLogInput> & { hobbsStart?: number; hobbsEnd?: number; fuelAdded?: number; oilAdded?: number; anomalies?: string; remarks?: string }) => {
    const auth = await requireAuth(LOGBOOK_ROLES);
    if ("error" in auth) return { error: auth.error };

    const existing = await prisma.flight_logs.findUnique({ where: { id: logID } });
    if (!existing) return { error: "Entrée introuvable" };

    if (existing.clubID !== auth.user.clubID) return { error: "Permissions insuffisantes" };

    const isManager = MANAGEMENT_ROLES.includes(auth.user.role);
    if (!isManager && auth.user.id !== existing.pilotID) {
        return { error: "Permissions insuffisantes" };
    }

    const canOverrideSigned = SIGN_OVERRIDE_ROLES.includes(auth.user.role);
    if (existing.pilotSigned && !canOverrideSigned) {
        return { error: "Impossible de modifier une entrée signée" };
    }

    try {
        const updated = await prisma.flight_logs.update({
            where: { id: logID },
            data: {
                ...(data.departureAirfield !== undefined && { departureAirfield: data.departureAirfield }),
                ...(data.arrivalAirfield !== undefined && { arrivalAirfield: data.arrivalAirfield }),
                ...(data.hobbsStart !== undefined && { hobbsStart: data.hobbsStart }),
                ...(data.hobbsEnd !== undefined && { hobbsEnd: data.hobbsEnd }),
                ...(data.fuelAdded !== undefined && { fuelAdded: data.fuelAdded }),
                ...(data.oilAdded !== undefined && { oilAdded: data.oilAdded }),
                ...(data.anomalies !== undefined && { anomalies: data.anomalies }),
                ...(data.remarks !== undefined && { remarks: data.remarks }),
                ...(data.takeoffs !== undefined && { takeoffs: data.takeoffs }),
                ...(data.landings !== undefined && { landings: data.landings }),
                ...(data.flightNature !== undefined && { flightNature: data.flightNature }),
                ...(data.durationMinutes !== undefined && {
                    durationMinutes: data.durationMinutes,
                    timeDC: existing.pilotFunction === "EP" ? data.durationMinutes : 0,
                    timePIC: existing.pilotFunction === "P" ? data.durationMinutes : 0,
                    timeInstructor: existing.pilotFunction === "I" ? data.durationMinutes : 0,
                }),
            },
        });

        if (data.hobbsEnd && existing.planeID) {
            await prisma.planes.update({
                where: { id: existing.planeID },
                data: { hobbsTotal: data.hobbsEnd },
            });
        }

        return { success: "Entrée mise à jour", log: updated };
    } catch {
        return { error: "Erreur lors de la mise à jour" };
    }
};

// ─── Signature ───

export const signFlightLog = async (logID: string) => {
    const auth = await requireAuth(LOGBOOK_ROLES);
    if ("error" in auth) return { error: auth.error };

    const log = await prisma.flight_logs.findUnique({ where: { id: logID } });
    if (!log) return { error: "Entrée introuvable" };

    if (auth.user.id !== log.pilotID) {
        return { error: "Seul le pilote concerné peut signer" };
    }

    if (log.pilotSigned) {
        return { error: "Entrée déjà signée" };
    }

    try {
        await prisma.flight_logs.update({
            where: { id: logID },
            data: { pilotSigned: true, pilotSignedAt: new Date() },
        });
        return { success: "Entrée signée" };
    } catch {
        return { error: "Erreur lors de la signature" };
    }
};

// ─── Suppression ───

export const deleteFlightLog = async (logID: string) => {
    const auth = await requireAuth([userRole.OWNER, userRole.ADMIN]);
    if ("error" in auth) return { error: auth.error };

    const log = await prisma.flight_logs.findUnique({ where: { id: logID } });
    if (!log) return { error: "Entrée introuvable" };

    if (log.clubID !== auth.user.clubID) return { error: "Permissions insuffisantes" };

    if (log.pilotSigned) {
        return { error: "Impossible de supprimer une entrée signée" };
    }

    try {
        await prisma.flight_logs.delete({ where: { id: logID } });
        return { success: "Entrée supprimée" };
    } catch {
        return { error: "Erreur lors de la suppression" };
    }
};

// ─── Totaux cumulés ───

export const getRunningTotals = async (pilotID: string, clubID: string) => {
    const auth = await requireAuth(LOGBOOK_ROLES);
    if ("error" in auth) return { error: auth.error };

    try {
        const agg = await prisma.flight_logs.aggregate({
            where: { pilotID, clubID },
            _sum: {
                durationMinutes: true,
                timeDC: true,
                timePIC: true,
                timeInstructor: true,
                takeoffs: true,
                landings: true,
            },
        });

        return {
            success: true,
            totals: {
                totalMinutes: agg._sum.durationMinutes ?? 0,
                totalDC: agg._sum.timeDC ?? 0,
                totalPIC: agg._sum.timePIC ?? 0,
                totalInstructor: agg._sum.timeInstructor ?? 0,
                totalTakeoffs: agg._sum.takeoffs ?? 0,
                totalLandings: agg._sum.landings ?? 0,
            },
        };
    } catch {
        return { error: "Erreur lors du calcul des totaux" };
    }
};

// ─── Flight log par session + pilote ───

export const getFlightLogBySession = async (sessionID: string, pilotID: string) => {
    const auth = await requireAuth(LOGBOOK_ROLES);
    if ("error" in auth) return { error: auth.error };

    try {
        const log = await prisma.flight_logs.findFirst({
            where: { sessionID, pilotID },
        });
        return { success: true, log: log ?? null };
    } catch {
        return { error: "Erreur lors de la récupération du log" };
    }
};

// ─── Hobbs courant d'un avion ───

export const getPlaneHobbs = async (planeID: string): Promise<number | null> => {
    try {
        const plane = await prisma.planes.findUnique({
            where: { id: planeID },
            select: { hobbsTotal: true },
        });
        return plane?.hobbsTotal ?? null;
    } catch {
        return null;
    }
};

// ─── Vols incomplets (non signés, date passée) ───

export const getIncompleteFlightLogs = async (pilotID: string, clubID: string) => {
    const auth = await requireAuth(LOGBOOK_ROLES);
    if ("error" in auth) return { error: auth.error };

    if (auth.user.id !== pilotID && !MANAGEMENT_ROLES.includes(auth.user.role)) {
        return { error: "Permissions insuffisantes" };
    }

    try {
        const logs = await prisma.flight_logs.findMany({
            where: {
                pilotID,
                clubID,
                pilotSigned: false,
                date: { lt: new Date() },
            },
            orderBy: { date: "desc" },
            take: 20,
        });
        return { success: true, logs };
    } catch {
        return { error: "Erreur lors de la récupération" };
    }
};

// ─── Auto-création depuis les sessions passées ───

export async function mapFlightType(ft: string | null): Promise<flightNature> {
    switch (ft) {
        case "TRAINING": return "INSTRUCTION";
        case "PRIVATE": return "LOCAL";
        case "SIGHTSEEING": return "VLO";
        case "DISCOVERY": return "VLD";
        case "EXAM": return "EXAM";
        case "FIRST_FLIGHT": return "FIRST_FLIGHT";
        case "INITATION": return "BAPTEME";
        default: return "INSTRUCTION";
    }
}

export const autoCreateLogsFromSessions = async (clubID: string) => {
    try {
        // Vérification rapide : comparer le nombre de sessions éligibles vs logs existants
        const [sessionCount, logCount] = await Promise.all([
            prisma.flight_sessions.count({
                where: {
                    clubID,
                    studentID: { not: null },
                    sessionDateStart: { lt: new Date(), gte: REGULATION_START },
                },
            }),
            prisma.flight_logs.count({
                where: { clubID, isManualEntry: false },
            }),
        ]);

        // Chaque session génère 2 logs (instructeur + élève)
        // Si le compte correspond, rien à faire
        if (logCount >= sessionCount * 2) {
            return { created: 0 };
        }

        // Sessions passées avec un élève, depuis l'entrée en vigueur
        const sessions = await prisma.flight_sessions.findMany({
            where: {
                clubID,
                studentID: { not: null },
                sessionDateStart: {
                    lt: new Date(),
                    gte: REGULATION_START,
                },
            },
            select: {
                id: true,
                sessionDateStart: true,
                sessionDateDuration_min: true,
                pilotID: true,
                pilotFirstName: true,
                pilotLastName: true,
                studentID: true,
                studentFirstName: true,
                studentLastName: true,
                studentPlaneID: true,
                flightType: true,
                student_type: true,
                classes: true,
            },
        });

        if (sessions.length === 0) return { created: 0 };

        // Récupérer les sessionIDs déjà logués
        const existingLogs = await prisma.flight_logs.findMany({
            where: {
                clubID,
                sessionID: { in: sessions.map((s) => s.id) },
            },
            select: { sessionID: true, pilotID: true },
        });

        const loggedSet = new Set(existingLogs.map((l) => `${l.sessionID}_${l.pilotID}`));

        // Récupérer infos avions
        const planeIDs = [...new Set(sessions.map((s) => s.studentPlaneID).filter((id): id is string => !!id && id !== "classroomSession" && id !== "noPlane"))];
        const planesMap = new Map<string, { name: string; immatriculation: string; classes: number }>();
        if (planeIDs.length > 0) {
            const planes = await prisma.planes.findMany({
                where: { id: { in: planeIDs } },
                select: { id: true, name: true, immatriculation: true, classes: true },
            });
            planes.forEach((p) => planesMap.set(p.id, p));
        }

        // Terrain par défaut du club
        const club = await prisma.club.findUnique({
            where: { id: clubID },
            select: { defaultAirfield: true },
        });
        const defaultAirfield = club?.defaultAirfield ?? undefined;

        const logsToCreate: Parameters<typeof prisma.flight_logs.create>[0]["data"][] = [];

        for (const session of sessions) {
            const planeInfo = session.studentPlaneID ? planesMap.get(session.studentPlaneID) : null;
            const isClassroom = session.studentPlaneID === "classroomSession";
            const isNoPlane = session.studentPlaneID === "noPlane";
            const nature = await mapFlightType(session.flightType ?? session.student_type ?? null);

            const basePlane = {
                planeID: isClassroom || isNoPlane ? null : session.studentPlaneID,
                planeRegistration: planeInfo?.immatriculation ?? (isClassroom ? "THEORIQUE" : isNoPlane ? "PERSO" : "N/A"),
                planeName: planeInfo?.name ?? (isClassroom ? "Théorique" : isNoPlane ? "Perso" : "Inconnu"),
                planeClass: planeInfo?.classes ?? null,
            };

            // Entrée instructeur
            const instructorKey = `${session.id}_${session.pilotID}`;
            if (!loggedSet.has(instructorKey)) {
                logsToCreate.push({
                    clubID,
                    sessionID: session.id,
                    date: session.sessionDateStart,
                    ...basePlane,
                    pilotID: session.pilotID,
                    pilotFirstName: session.pilotFirstName,
                    pilotLastName: session.pilotLastName,
                    pilotFunction: "I",
                    studentID: session.studentID,
                    studentFirstName: session.studentFirstName,
                    studentLastName: session.studentLastName,
                    flightNature: nature,
                    durationMinutes: session.sessionDateDuration_min,
                    takeoffs: 1,
                    landings: 1,
                    timeDC: 0,
                    timePIC: 0,
                    timeInstructor: session.sessionDateDuration_min,
                    departureAirfield: defaultAirfield,
                    arrivalAirfield: defaultAirfield,
                    isManualEntry: false,
                });
            }

            // Entrée élève
            if (session.studentID) {
                const studentKey = `${session.id}_${session.studentID}`;
                if (!loggedSet.has(studentKey)) {
                    logsToCreate.push({
                        clubID,
                        sessionID: session.id,
                        date: session.sessionDateStart,
                        ...basePlane,
                        pilotID: session.studentID,
                        pilotFirstName: session.studentFirstName ?? "",
                        pilotLastName: session.studentLastName ?? "",
                        pilotFunction: "EP",
                        instructorID: session.pilotID,
                        instructorFirstName: session.pilotFirstName,
                        instructorLastName: session.pilotLastName,
                        flightNature: nature,
                        durationMinutes: session.sessionDateDuration_min,
                        takeoffs: 1,
                        landings: 1,
                        timeDC: session.sessionDateDuration_min,
                        timePIC: 0,
                        timeInstructor: 0,
                        departureAirfield: defaultAirfield,
                        arrivalAirfield: defaultAirfield,
                        isManualEntry: false,
                    });
                }
            }
        }

        if (logsToCreate.length === 0) return { created: 0 };

        // Batch create
        const batchSize = 100;
        let created = 0;
        for (let i = 0; i < logsToCreate.length; i += batchSize) {
            const batch = logsToCreate.slice(i, i + batchSize);
            const result = await prisma.$transaction(
                batch.map((data) => prisma.flight_logs.create({ data }))
            );
            created += result.length;
        }

        return { created };
    } catch {
        return { error: "Erreur lors de la synchronisation des carnets" };
    }
};
