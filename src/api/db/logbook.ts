"use server";

import { flightNature, instructionSubType, userRole } from "@prisma/client";
import prisma from "../prisma";
import { requireAuth } from "./users";
import {
    computeDurationMinutes,
    computeFlightTimes,
    derivePilotFunction,
    isInstructorRole,
    validateNatureSubType,
} from "@/lib/logbookCalc";

const LOGBOOK_ROLES: userRole[] = [
    userRole.PILOT, userRole.STUDENT, userRole.INSTRUCTOR,
    userRole.OWNER, userRole.ADMIN, userRole.MANAGER,
];
// Rôles pouvant écrire (modifier/signer) un vol — STUDENT exclu
const LOGBOOK_WRITE_ROLES: userRole[] = [
    userRole.PILOT, userRole.INSTRUCTOR,
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

// Seuil de prise en compte des sessions pour auto-création de logs. Calé sur la
// date de déploiement de cette feature (2026-05-25) pour ne PAS importer la
// masse historique : seules les sessions à partir de cette date génèrent un
// log. Les sessions antérieures ne sont jamais auto-loguées (silently ignored).
const REGULATION_START = new Date("2026-05-25");

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
    instructorID?: string;
    instructorFirstName?: string;
    instructorLastName?: string;
    studentID?: string;
    studentFirstName?: string;
    studentLastName?: string;
    studentEmail?: string;
    studentPhone?: string;
    flightNature: flightNature;
    instructionSubType?: instructionSubType | null;
    takeoffs: number;
    landings: number;
    departureAirfield?: string;
    arrivalAirfield?: string;
    // Override de hobbsStart : ignoré sauf si le créateur est OWNER/ADMIN.
    // Par défaut, le serveur lit plane.hobbsTotal courant.
    hobbsStart?: number;
    hobbsEnd?: number;
    fuelAdded?: number;
    machineAnomalies?: string;
    personalObservation?: string;
    isManualEntry: boolean;
}

export interface UpdateFlightLogInput {
    departureAirfield?: string;
    arrivalAirfield?: string;
    takeoffs?: number;
    landings?: number;
    hobbsStart?: number;
    hobbsEnd?: number;
    fuelAdded?: number;
    machineAnomalies?: string;
    personalObservation?: string;
    flightNature?: flightNature;
    instructionSubType?: instructionSubType | null;
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
                // 1 log par vol d'instruction (pilotID=instructeur, studentID=élève).
                // Le carnet du pilote inclut les vols où il est pilote OU élève.
                OR: [{ pilotID }, { studentID: pilotID }],
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
        return { error: "Erreur lors de la récupération du carnet de vol pilote" };
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
        return { error: "Erreur lors de la récupération du carnet de vol machine" };
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

    if (!data.planeRegistration || !data.pilotID) {
        return { error: "Champs obligatoires manquants" };
    }

    const natureCheck = validateNatureSubType(data.flightNature, data.instructionSubType);
    if (!natureCheck.ok) return { error: natureCheck.error };

    // Déduction de la fonction côté serveur : la nature + le rôle du pilote
    // déterminent EP / P / I. Si la création se fait pour quelqu'un d'autre
    // (manager), on se base sur le rôle du pilote cible, pas du créateur.
    let pilotRole: userRole = auth.user.role;
    if (data.pilotID !== auth.user.id) {
        const targetPilot = await prisma.user.findUnique({
            where: { id: data.pilotID },
            select: { role: true },
        });
        if (!targetPilot) return { error: "Pilote introuvable" };
        pilotRole = targetPilot.role;
    }
    const pilotFunction = derivePilotFunction(data.flightNature, pilotRole);

    // hobbsStart est lu côté serveur depuis plane.hobbsTotal pour interdire
    // toute manipulation. Exception : OWNER/ADMIN peuvent l'override (mauvaise
    // pratique mais utile pour corriger une erreur de saisie).
    const canEditHobbsStart = SIGN_OVERRIDE_ROLES.includes(auth.user.role);
    let hobbsStart: number | null = null;
    if (data.planeID) {
        const plane = await prisma.planes.findUnique({
            where: { id: data.planeID },
            select: { hobbsTotal: true, clubID: true },
        });
        if (!plane) return { error: "Aéronef introuvable" };
        if (plane.clubID !== data.clubID) return { error: "Permissions insuffisantes" };
        hobbsStart = plane.hobbsTotal ?? null;
    }
    if (canEditHobbsStart && data.hobbsStart !== undefined) {
        hobbsStart = data.hobbsStart;
    }

    if (data.hobbsEnd != null && hobbsStart != null && data.hobbsEnd <= hobbsStart) {
        return { error: "Les heures moteur de fin doivent être supérieures à celles de début" };
    }

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
                pilotFunction,
                instructorID: data.instructorID,
                instructorFirstName: data.instructorFirstName,
                instructorLastName: data.instructorLastName,
                studentID: data.studentID,
                studentFirstName: data.studentFirstName,
                studentLastName: data.studentLastName,
                studentEmail: data.studentEmail,
                studentPhone: data.studentPhone,
                flightNature: data.flightNature,
                instructionSubType: data.instructionSubType ?? null,
                takeoffs: data.takeoffs,
                landings: data.landings,
                departureAirfield: data.departureAirfield,
                arrivalAirfield: data.arrivalAirfield,
                hobbsStart,
                hobbsEnd: data.hobbsEnd,
                fuelAdded: data.fuelAdded,
                machineAnomalies: data.machineAnomalies,
                personalObservation: data.personalObservation,
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

export const updateFlightLog = async (logID: string, data: UpdateFlightLogInput) => {
    const auth = await requireAuth(LOGBOOK_WRITE_ROLES);
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

    const nextNature = data.flightNature ?? existing.flightNature;
    const nextSubType =
        data.instructionSubType !== undefined ? data.instructionSubType : existing.instructionSubType;
    const natureCheck = validateNatureSubType(nextNature, nextSubType);
    if (!natureCheck.ok) return { error: natureCheck.error };

    // hobbsStart : modification réservée à OWNER/ADMIN (mauvaise pratique, mais
    // utile pour corriger une erreur de saisie). Si fourni par un autre rôle,
    // on l'ignore silencieusement (le client est censé bloquer le champ).
    const canEditHobbsStart = SIGN_OVERRIDE_ROLES.includes(auth.user.role);
    const nextHobbsStart = canEditHobbsStart && data.hobbsStart !== undefined
        ? data.hobbsStart
        : existing.hobbsStart;

    if (data.hobbsEnd != null && nextHobbsStart != null && data.hobbsEnd <= nextHobbsStart) {
        return { error: "Les heures moteur de fin doivent être supérieures à celles de début" };
    }

    try {
        const updated = await prisma.flight_logs.update({
            where: { id: logID },
            data: {
                ...(data.departureAirfield !== undefined && { departureAirfield: data.departureAirfield }),
                ...(data.arrivalAirfield !== undefined && { arrivalAirfield: data.arrivalAirfield }),
                ...(canEditHobbsStart && data.hobbsStart !== undefined && { hobbsStart: data.hobbsStart }),
                ...(data.hobbsEnd !== undefined && { hobbsEnd: data.hobbsEnd }),
                ...(data.fuelAdded !== undefined && { fuelAdded: data.fuelAdded }),
                ...(data.machineAnomalies !== undefined && { machineAnomalies: data.machineAnomalies }),
                ...(data.personalObservation !== undefined && { personalObservation: data.personalObservation }),
                ...(data.takeoffs !== undefined && { takeoffs: data.takeoffs }),
                ...(data.landings !== undefined && { landings: data.landings }),
                ...(data.flightNature !== undefined && { flightNature: data.flightNature }),
                ...(data.instructionSubType !== undefined && { instructionSubType: data.instructionSubType }),
            },
        });

        // Pas de mise à jour de plane.hobbsTotal ici : ce serait incohérent si
        // l'utilisateur édite plusieurs vols dans le désordre avant signature.
        // L'avancement de plane.hobbsTotal se fait à la signature (signFlightLog)
        // ou à la création manuelle (createFlightLog).

        return { success: "Entrée mise à jour", log: updated };
    } catch {
        return { error: "Erreur lors de la mise à jour" };
    }
};

// ─── Signature ───

export const signFlightLog = async (logID: string) => {
    const auth = await requireAuth(LOGBOOK_WRITE_ROLES);
    if ("error" in auth) return { error: auth.error };

    const log = await prisma.flight_logs.findUnique({ where: { id: logID } });
    if (!log) return { error: "Entrée introuvable" };

    if (auth.user.id !== log.pilotID) {
        return { error: "Seul le pilote concerné peut signer" };
    }

    if (log.pilotSigned) {
        return { error: "Entrée déjà signée" };
    }

    if (log.hobbsEnd == null) {
        return { error: "Les heures moteur de fin sont obligatoires pour signer" };
    }

    try {
        const signedAt = new Date();
        await prisma.$transaction(async (tx) => {
            // hobbsStart est figé à la signature : on lit le hobbsTotal courant
            // de l'avion (= reflet de l'état au moment où le pilote signe). Le
            // hobbsTotal de l'avion est ensuite avancé à hobbsEnd. Ordre de
            // signature chronologique recommandé pour cohérence (cf.
            // getIncompleteFlightLogs trié asc).
            let hobbsStart: number | null = log.hobbsStart;
            if (log.planeID && hobbsStart == null) {
                const plane = await tx.planes.findUnique({
                    where: { id: log.planeID },
                    select: { hobbsTotal: true },
                });
                hobbsStart = plane?.hobbsTotal ?? null;
            }

            await tx.flight_logs.update({
                where: { id: logID },
                data: {
                    pilotSigned: true,
                    pilotSignedAt: signedAt,
                    ...(hobbsStart != null && { hobbsStart }),
                },
            });

            if (log.planeID && log.hobbsEnd != null) {
                await tx.planes.update({
                    where: { id: log.planeID },
                    data: { hobbsTotal: log.hobbsEnd },
                });
            }
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
        const logs = await prisma.flight_logs.findMany({
            // 1 log par instruction : on cumule aussi les vols où le pilote
            // demandé est l'élève (studentID) — sa fonction sera 'EP' dans
            // le calcul des temps.
            where: {
                OR: [{ pilotID }, { studentID: pilotID }],
                clubID,
            },
            select: {
                hobbsStart: true,
                hobbsEnd: true,
                pilotID: true,
                studentID: true,
                pilotFunction: true,
                takeoffs: true,
                landings: true,
            },
        });

        let totalMinutes = 0, totalDC = 0, totalPIC = 0, totalInstructor = 0;
        let totalTakeoffs = 0, totalLandings = 0;
        for (const log of logs) {
            // pilotFunction effectif pour ce pilote :
            // - s'il est le pilotID du log → fonction stockée (I ou P)
            // - sinon il est studentID → fonction 'EP'
            const effectiveFunction = log.pilotID === pilotID ? log.pilotFunction : "EP";
            const times = computeFlightTimes({
                hobbsStart: log.hobbsStart,
                hobbsEnd: log.hobbsEnd,
                pilotFunction: effectiveFunction,
            });
            totalMinutes += times.durationMinutes;
            totalDC += times.timeDC;
            totalPIC += times.timePIC;
            totalInstructor += times.timeInstructor;
            totalTakeoffs += log.takeoffs;
            totalLandings += log.landings;
        }

        return {
            success: true,
            totals: {
                totalMinutes,
                totalDC,
                totalPIC,
                totalInstructor,
                totalTakeoffs,
                totalLandings,
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
            // 1 log par session (instructeur), accessible aussi par l'élève via studentID.
            where: { sessionID, OR: [{ pilotID }, { studentID: pilotID }] },
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
        // `flight_logs.date` est de type PG `DATE` (cf. schema.prisma : @db.Date) :
        // l'heure est tronquée. Filtrer avec `lt: new Date()` rejette les vols
        // du jour parce que la comparaison se fait au niveau date pure
        // (`aujourd'hui < aujourd'hui` = false). On compare donc au début du
        // lendemain. Les logs ne sont créés que pour des sessions déjà
        // commencées (cf. autoCreateLogsFromSessions), donc un log daté
        // d'aujourd'hui correspond bien à un vol passé.
        const tomorrow = new Date();
        tomorrow.setUTCHours(0, 0, 0, 0);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

        const logs = await prisma.flight_logs.findMany({
            where: {
                pilotID,
                clubID,
                pilotSigned: false,
                date: { lt: tomorrow },
            },
            // Ordre chronologique asc : on signe les plus anciens d'abord pour
            // que le hobbsStart lu à la signature (= plane.hobbsTotal courant)
            // soit cohérent vol après vol.
            orderBy: { date: "asc" },
            take: 20,
        });
        return { success: true, logs };
    } catch {
        return { error: "Erreur lors de la récupération" };
    }
};

// ─── Auto-création depuis les sessions passées ───

// Compatibilité avec flight_sessions qui utilise encore l'enum legacy
// NatureOfTheft / flightType. Mapping vers le nouveau modèle. Voir le ticket
// futur "alignement flight_sessions" pour la refonte complète.
export async function mapFlightType(
    ft: string | null
): Promise<{ nature: flightNature; subType: instructionSubType | null }> {
    switch (ft) {
        case "TRAINING": return { nature: "INSTRUCTION", subType: "LOCAL" };
        case "PRIVATE": return { nature: "CDB", subType: null };
        case "SIGHTSEEING": return { nature: "INSTRUCTION", subType: "LOCAL" };
        case "DISCOVERY": return { nature: "INSTRUCTION", subType: "BAPTEME" };
        case "EXAM": return { nature: "INSTRUCTION", subType: "EXAM" };
        case "FIRST_FLIGHT": return { nature: "INSTRUCTION", subType: "BAPTEME" };
        case "INITATION": return { nature: "INSTRUCTION", subType: "BAPTEME" };
        default: return { nature: "INSTRUCTION", subType: "LOCAL" };
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

        // 1 log par session (l'instructeur, avec studentID rempli).
        if (logCount >= sessionCount) {
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

        // Récupérer les sessionIDs déjà logués (1 log par session attendu)
        const existingLogs = await prisma.flight_logs.findMany({
            where: {
                clubID,
                sessionID: { in: sessions.map((s) => s.id) },
            },
            select: { sessionID: true },
        });

        const loggedSet = new Set(existingLogs.map((l) => l.sessionID).filter((id): id is string => !!id));

        // Récupérer infos avions
        const planeIDs = [...new Set(sessions.map((s) => s.studentPlaneID).filter((id): id is string => !!id && id !== "classroomSession" && id !== "noPlane"))];
        const planesMap = new Map<string, { name: string; immatriculation: string; classes: number; hobbsTotal: number | null }>();
        if (planeIDs.length > 0) {
            const planes = await prisma.planes.findMany({
                where: { id: { in: planeIDs } },
                select: { id: true, name: true, immatriculation: true, classes: true, hobbsTotal: true },
            });
            planes.forEach((p) => planesMap.set(p.id, p));
        }

        // Terrain par défaut du club = son id (convention : Club.id == code OACI).
        const defaultAirfield = clubID;

        const logsToCreate: Parameters<typeof prisma.flight_logs.create>[0]["data"][] = [];

        for (const session of sessions) {
            const planeInfo = session.studentPlaneID ? planesMap.get(session.studentPlaneID) : null;
            const isClassroom = session.studentPlaneID === "classroomSession";
            const isNoPlane = session.studentPlaneID === "noPlane";
            const { nature, subType } = await mapFlightType(session.flightType ?? session.student_type ?? null);

            const basePlane = {
                planeID: isClassroom || isNoPlane ? null : session.studentPlaneID,
                planeRegistration: planeInfo?.immatriculation ?? (isClassroom ? "THEORIQUE" : isNoPlane ? "PERSO" : "N/A"),
                planeName: planeInfo?.name ?? (isClassroom ? "Théorique" : isNoPlane ? "Perso" : "Inconnu"),
                planeClass: planeInfo?.classes ?? null,
            };

            // hobbsStart sera rempli à la signature (cf. signFlightLog) en
            // lisant plane.hobbsTotal courant.
            // 1 seul log par session : l'instructeur, avec studentID rempli.
            // Le carnet de l'élève récupère ce log via studentID (cf.
            // getLogbookByPilot avec OR pilotID/studentID).
            if (!loggedSet.has(session.id)) {
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
                    instructionSubType: subType,
                    takeoffs: 1,
                    landings: 1,
                    hobbsStart: null,
                    hobbsEnd: null,
                    departureAirfield: defaultAirfield,
                    arrivalAirfield: defaultAirfield,
                    isManualEntry: false,
                });
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

// Re-export du helper pour les composants client qui en ont besoin.
// Server actions ne pouvant exporter que des fonctions async, on encapsule.
export async function getIsInstructorRole(role: userRole): Promise<boolean> {
    return isInstructorRole(role);
}

export async function getComputeDuration(
    hobbsStart: number | null,
    hobbsEnd: number | null
): Promise<number> {
    return computeDurationMinutes(hobbsStart, hobbsEnd);
}
