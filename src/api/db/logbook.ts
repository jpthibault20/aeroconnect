"use server";

import { revalidatePath } from "next/cache";
import { flightNature, flight_logs, instructionSubType, userRole } from "@prisma/client";
import prisma from "../prisma";
import { requireAuth } from "./users";
import {
    advanceHobbsTotal,
    computeDurationMinutes,
    computeFlightTimes,
    derivePilotFunction,
    isInstructorRole,
    resolveCreateHobbsStart,
    resolveSignHobbsStart,
    resolveUpdateHobbs,
    rollbackHobbsTotal,
    validateHobbsRange,
    validateNatureSubType,
} from "@/lib/logbookCalc";

const LOGBOOK_ROLES: userRole[] = [
    userRole.PILOT, userRole.STUDENT, userRole.INSTRUCTOR,
    userRole.OWNER, userRole.ADMIN, userRole.MANAGER,
];
// Rôles pouvant écrire (modifier/signer) un vol — STUDENT exclu (l'élève vole
// toujours avec un instructeur : c'est l'instructeur qui saisit et signe).
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

export interface CreateFlightLogInput {
    clubID: string;
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
    // hobbsStart : le serveur lit plane.hobbsTotal courant. La valeur envoyée
    // n'est prise en compte que par un OWNER/ADMIN (override) ou si le compteur
    // de la machine est encore inconnu (initialisation par la première entrée).
    hobbsStart?: number;
    hobbsEnd?: number;
    fuelAdded?: number;
    machineAnomalies?: string;
    personalObservation?: string;
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

// ─── Carnet de vol club (plage de dates, pilote + machine confondus) ───
// Utilisée par le sélecteur de période de la page carnet de vol : le filtrage
// par rôle (perso vs club entier) reste fait côté client comme pour le
// chargement initial (ServerPageComp), cette action ne fait que reborner la
// période.

export const getClubFlightLogsByDateRange = async (
    clubID: string,
    startDate: Date,
    endDate: Date
): Promise<{ error: string | undefined } | { success: true; logs: flight_logs[] }> => {
    const auth = await requireAuth(LOGBOOK_ROLES);
    if ("error" in auth) return { error: auth.error };
    if (auth.user.clubID !== clubID) {
        return { error: "Permissions insuffisantes" };
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    try {
        const logs = await prisma.flight_logs.findMany({
            where: {
                clubID,
                date: { gte: start, lte: end },
            },
            orderBy: { date: "desc" },
        });
        return { success: true, logs };
    } catch {
        return { error: "Erreur lors de la récupération du carnet de vol" };
    }
};

// ─── Création ───
//
// Règle du compteur moteur (cf. advanceHobbsTotal dans logbookCalc) : une
// entrée est une lecture du compteur physique. Son hobbsStart est figé ICI
// (= plane.hobbsTotal courant) et sa fin avance le compteur dès la création,
// signée ou non, pour que le pilote suivant voie un début à jour. Le compteur
// ne recule jamais (vol antérieur saisi en retard).

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
    // toute manipulation (règle et exceptions : cf. resolveCreateHobbsStart).
    let hobbsStart: number | null = null;
    let planeHobbsTotal: number | null = null;
    if (data.planeID) {
        const plane = await prisma.planes.findUnique({
            where: { id: data.planeID },
            select: { hobbsTotal: true, clubID: true },
        });
        if (!plane) return { error: "Aéronef introuvable" };
        if (plane.clubID !== data.clubID) return { error: "Permissions insuffisantes" };
        planeHobbsTotal = plane.hobbsTotal ?? null;
        hobbsStart = resolveCreateHobbsStart({
            planeHobbsTotal,
            requested: data.hobbsStart,
            canOverride: SIGN_OVERRIDE_ROLES.includes(auth.user.role),
        });
    }

    const range = validateHobbsRange(hobbsStart, data.hobbsEnd);
    if (!range.ok) return { error: range.error };

    try {
        const log = await prisma.$transaction(async (tx) => {
            const created = await tx.flight_logs.create({
                data: {
                    clubID: data.clubID,
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
                    isManualEntry: true,
                },
            });

            if (data.planeID) {
                const next = advanceHobbsTotal(planeHobbsTotal, null, data.hobbsEnd);
                if (next != null && next !== planeHobbsTotal) {
                    await tx.planes.update({
                        where: { id: data.planeID },
                        data: { hobbsTotal: next },
                    });
                }
            }
            return created;
        });

        // Invalide le cache RSC de la page carnet : sans ça, une navigation SPA
        // (ou une ré-ouverture de l'app) vers /logbook resservirait la version
        // en cache et l'entrée n'apparaîtrait qu'après un rechargement manuel.
        revalidatePath("/logbook");
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

    // hobbsStart : modification réservée à OWNER/ADMIN (cf. resolveUpdateHobbs).
    const hobbs = resolveUpdateHobbs({
        existing,
        requestedStart: data.hobbsStart,
        requestedEnd: data.hobbsEnd,
        canOverride: SIGN_OVERRIDE_ROLES.includes(auth.user.role),
    });
    if (!hobbs.ok) return { error: hobbs.error };

    try {
        const updated = await prisma.$transaction(async (tx) => {
            const log = await tx.flight_logs.update({
                where: { id: logID },
                data: {
                    ...(data.departureAirfield !== undefined && { departureAirfield: data.departureAirfield }),
                    ...(data.arrivalAirfield !== undefined && { arrivalAirfield: data.arrivalAirfield }),
                    ...(hobbs.startOverride !== undefined && { hobbsStart: hobbs.startOverride }),
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

            // La fin corrigée se répercute sur le compteur selon la règle
            // d'avancement : si cette entrée est en tête, sa nouvelle fin
            // remplace le compteur (correction de la dernière lecture) ; sinon
            // le compteur ne peut qu'avancer.
            if (existing.planeID && data.hobbsEnd !== undefined) {
                const plane = await tx.planes.findUnique({
                    where: { id: existing.planeID },
                    select: { hobbsTotal: true },
                });
                const current = plane?.hobbsTotal ?? null;
                const next = advanceHobbsTotal(current, existing.hobbsEnd, data.hobbsEnd);
                if (next != null && next !== current) {
                    await tx.planes.update({
                        where: { id: existing.planeID },
                        data: { hobbsTotal: next },
                    });
                }
            }
            return log;
        });

        revalidatePath("/logbook");
        return { success: "Entrée mise à jour", log: updated };
    } catch {
        return { error: "Erreur lors de la mise à jour" };
    }
};

// ─── Signature ───

// Fait remonter un refus métier hors de la transaction Prisma (qui l'annule)
// sans le confondre avec une erreur technique.
class HobbsStartUnresolvedError extends Error {}

export const signFlightLog = async (logID: string) => {
    const auth = await requireAuth(LOGBOOK_WRITE_ROLES);
    if ("error" in auth) return { error: auth.error };

    const log = await prisma.flight_logs.findUnique({ where: { id: logID } });
    if (!log) return { error: "Entrée introuvable" };

    // Un vol d'instruction est encadré, saisi ET signé par son instructeur, qui
    // EST le pilotID du log (studentID = élève). Le contrôle pilotID ci-dessous
    // garantit donc qu'un instructeur ne peut signer QUE les vols qu'il a
    // lui-même encadrés : il ne peut pas signer le vol d'un autre pilote ou d'un
    // autre instructeur (le rôle INSTRUCTOR n'est pas dans SIGN_OVERRIDE_ROLES).
    if (auth.user.id !== log.pilotID) {
        // Saisie déléguée (provisoire) : seuls président/admin (SIGN_OVERRIDE_ROLES)
        // du même club peuvent signer pour le compte du pilote — cas d'usage :
        // l'élève a un bug sur son app et ne peut pas signer lui-même.
        if (!SIGN_OVERRIDE_ROLES.includes(auth.user.role)) {
            return { error: "Seul le pilote concerné peut signer" };
        }
        if (log.clubID !== auth.user.clubID) {
            return { error: "Permissions insuffisantes" };
        }
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
            // La signature ne fait que verrouiller : hobbsStart a été figé à la
            // création et le compteur déjà avancé. Le cas des entrées
            // historiques sans début est traité par resolveSignHobbsStart.
            let hobbsStart: number | null = log.hobbsStart;
            let current: number | null = null;
            if (log.planeID) {
                const plane = await tx.planes.findUnique({
                    where: { id: log.planeID },
                    select: { hobbsTotal: true },
                });
                current = plane?.hobbsTotal ?? null;
                const resolved = resolveSignHobbsStart({
                    logStart: log.hobbsStart,
                    logEnd: log.hobbsEnd,
                    planeHobbsTotal: current,
                });
                if (!resolved.ok) throw new HobbsStartUnresolvedError(resolved.error);
                hobbsStart = resolved.hobbsStart;
            }

            await tx.flight_logs.update({
                where: { id: logID },
                data: {
                    pilotSigned: true,
                    pilotSignedAt: signedAt,
                    ...(hobbsStart != null && { hobbsStart }),
                },
            });

            // Filet de sécurité : le compteur ne recule jamais, même si cette
            // entrée n'avait pas encore été prise en compte (historique).
            if (log.planeID) {
                const next = advanceHobbsTotal(current, null, log.hobbsEnd);
                if (next != null && next !== current) {
                    await tx.planes.update({
                        where: { id: log.planeID },
                        data: { hobbsTotal: next },
                    });
                }
            }
        });
        revalidatePath("/logbook");
        return { success: "Entrée signée" };
    } catch (e) {
        if (e instanceof HobbsStartUnresolvedError) return { error: e.message };
        return { error: "Erreur lors de la signature" };
    }
};

// ─── Suppression ───

export const deleteFlightLog = async (logID: string) => {
    const auth = await requireAuth(LOGBOOK_WRITE_ROLES);
    if ("error" in auth) return { error: auth.error };

    const log = await prisma.flight_logs.findUnique({ where: { id: logID } });
    if (!log) return { error: "Entrée introuvable" };

    if (log.clubID !== auth.user.clubID) return { error: "Permissions insuffisantes" };

    // Un vol signé est verrouillé : jamais supprimable ici (même OWNER/ADMIN
    // doivent d'abord le dé-signer via un flux dédié).
    if (log.pilotSigned) {
        return { error: "Impossible de supprimer une entrée signée" };
    }

    // Qui peut supprimer un vol NON signé :
    //  - OWNER/ADMIN : n'importe quel vol de leur club ;
    //  - le pilote du vol lui-même : son propre vol.
    const canOverride = SIGN_OVERRIDE_ROLES.includes(auth.user.role);
    if (!canOverride && auth.user.id !== log.pilotID) {
        return { error: "Permissions insuffisantes" };
    }

    try {
        await prisma.$transaction(async (tx) => {
            await tx.flight_logs.delete({ where: { id: logID } });

            // Si l'entrée supprimée était la dernière lecture du compteur, on
            // revient à son début : sinon une fin erronée resterait gravée dans
            // plane.hobbsTotal et polluerait tous les vols suivants.
            if (log.planeID) {
                const plane = await tx.planes.findUnique({
                    where: { id: log.planeID },
                    select: { hobbsTotal: true },
                });
                const current = plane?.hobbsTotal ?? null;
                const next = rollbackHobbsTotal(current, log);
                if (next !== current) {
                    await tx.planes.update({
                        where: { id: log.planeID },
                        data: { hobbsTotal: next },
                    });
                }
            }
        });
        revalidatePath("/logbook");
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
