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
import { canLogFlightOnPlane } from "@/lib/planeVisibility";
import {
    chargeSignedFlight,
    notifyLowBalanceIfCrossed,
    reconcileSignedFlight,
    WalletChargeError,
    WalletMovementResult,
} from "../walletLedger";

const LOGBOOK_ROLES: userRole[] = [
    userRole.PILOT, userRole.STUDENT, userRole.INSTRUCTOR,
    userRole.OWNER, userRole.ADMIN, userRole.MANAGER,
];
// Roles allowed to write (edit/sign) a flight. STUDENT excluded: a student always
// flies with an instructor, who enters and signs the flight.
const LOGBOOK_WRITE_ROLES: userRole[] = [
    userRole.PILOT, userRole.INSTRUCTOR,
    userRole.OWNER, userRole.ADMIN, userRole.MANAGER,
];
// Roles allowed to view/edit other pilots' flights
const MANAGEMENT_ROLES: userRole[] = [
    userRole.OWNER, userRole.ADMIN, userRole.MANAGER,
];
// Roles allowed to edit an already signed flight
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
    // hobbsStart: the server reads the current plane.hobbsTotal. The value sent is
    // only used for an OWNER/ADMIN (override) or when the plane's counter is still
    // unknown (initialized by the first entry).
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

// ─── Pilot logbook ───

export const getLogbookByPilot = async (pilotID: string, clubID: string, year?: number) => {
    const auth = await requireAuth(LOGBOOK_ROLES);
    if ("error" in auth) return { error: auth.error };

    // A pilot only sees their own logbook, unless owner/admin/manager
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
                // 1 log per instruction flight (pilotID=instructor, studentID=student).
                // A pilot's logbook includes flights where they are the pilot OR the student.
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

// ─── Plane logbook ───

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

// ─── Club logbook (date range, all pilots and planes) ───
// Used by the logbook page's period picker: role filtering (own vs whole club)
// stays client-side as for the initial load (ServerPageComp); this action only
// narrows the period.

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

// ─── Creation ───
// 
// Hobbs rule (see advanceHobbsTotal in logbookCalc): an entry is a reading of
// the physical counter. Its hobbsStart is frozen HERE (= current
// plane.hobbsTotal) and its end advances the counter on creation, signed or not,
// so the next pilot sees an up-to-date start. The counter never goes backwards
// (earlier flight entered late).

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

    // The function is derived server-side: the flight type + the pilot's role
    // determine EP / P / I. When creating for someone else (manager), the target
    // pilot's role is used, not the creator's.
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

    // hobbsStart is read server-side from plane.hobbsTotal to prevent tampering
    // (rule and exceptions: see resolveCreateHobbsStart).
    let hobbsStart: number | null = null;
    let planeHobbsTotal: number | null = null;
    if (data.planeID) {
        const plane = await prisma.planes.findUnique({
            where: { id: data.planeID },
            select: { hobbsTotal: true, clubID: true, ownerID: true },
        });
        if (!plane) return { error: "Aéronef introuvable" };
        if (plane.clubID !== data.clubID) return { error: "Permissions insuffisantes" };
        // Private plane: only the flight's pilot's or student's own plane
        // (president / admin: any club plane).
        if (!canLogFlightOnPlane(plane, { actor: auth.user, pilotID: data.pilotID, studentID: data.studentID })) {
            return { error: "Cette machine privée n'appartient ni au pilote ni à l'élève de ce vol." };
        }
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

        // Invalidate the logbook page's RSC cache: otherwise an SPA navigation (or
        // reopening the app) to /logbook would serve the cached version and the entry
        // would only show after a manual reload.
        revalidatePath("/logbook");
        return { success: "Entrée de carnet créée avec succès", log };
    } catch {
        return { error: "Erreur lors de la création de l'entrée" };
    }
};

// ─── Update ───

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

    // hobbsStart: only OWNER/ADMIN can change it (see resolveUpdateHobbs).
    const hobbs = resolveUpdateHobbs({
        existing,
        requestedStart: data.hobbsStart,
        requestedEnd: data.hobbsEnd,
        canOverride: SIGN_OVERRIDE_ROLES.includes(auth.user.role),
    });
    if (!hobbs.ok) return { error: hobbs.error };

    let walletMovement: WalletMovementResult | null = null;
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

            // The corrected end is applied to the counter using the advance rule: if this
            // entry is the head, its new end replaces the counter (correcting the last
            // reading); otherwise the counter can only move forward.
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

            // Already signed (hence already debited) flight corrected by OWNER/ADMIN:
            // automatic wallet adjustment at the frozen rate (AER-66).
            if (existing.pilotSigned) {
                walletMovement = await reconcileSignedFlight(tx, log);
            }
            return log;
        });

        revalidatePath("/logbook");
        await notifyLowBalanceIfCrossed(walletMovement);
        return { success: "Entrée mise à jour", log: updated };
    } catch {
        return { error: "Erreur lors de la mise à jour" };
    }
};

// ─── Signing ───

// Carries a business refusal out of the Prisma transaction (which rolls it back)
// without mistaking it for a technical error.
class HobbsStartUnresolvedError extends Error {}
class AlreadySignedError extends Error {}

export const signFlightLog = async (logID: string) => {
    const auth = await requireAuth(LOGBOOK_WRITE_ROLES);
    if ("error" in auth) return { error: auth.error };

    const log = await prisma.flight_logs.findUnique({ where: { id: logID } });
    if (!log) return { error: "Entrée introuvable" };

    // An instruction flight is supervised, entered AND signed by its instructor, who
    // IS the log's pilotID (studentID = student). The pilotID check below therefore
    // ensures an instructor can only sign flights they supervised themselves, never
    // another pilot's or instructor's (INSTRUCTOR is not in SIGN_OVERRIDE_ROLES).
    if (auth.user.id !== log.pilotID) {
        // Delegated entry (temporary): only a president/admin (SIGN_OVERRIDE_ROLES) of
        // the same club can sign on the pilot's behalf, e.g. when the student's app is
        // broken and they cannot sign themselves.
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

    let walletMovement: WalletMovementResult | null = null;
    try {
        const signedAt = new Date();
        await prisma.$transaction(async (tx) => {
            // Signing only locks: hobbsStart was frozen at creation and the counter already
            // advanced. Historical entries without a start are handled by
            // resolveSignHobbsStart.
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

            // Optimistic lock: only the first concurrent signature goes through, otherwise
            // two simultaneous clicks would debit the wallet twice.
            const locked = await tx.flight_logs.updateMany({
                where: { id: logID, pilotSigned: false },
                data: {
                    pilotSigned: true,
                    pilotSignedAt: signedAt,
                    ...(hobbsStart != null && { hobbsStart }),
                },
            });
            if (locked.count !== 1) throw new AlreadySignedError("Entrée déjà signée");

            // Wallet debit (AER-66): a missing rate throws WalletChargeError, which rolls
            // back the whole signature.
            walletMovement = await chargeSignedFlight(tx, { ...log, hobbsStart });

            // Safety net: the counter never goes backwards, even if this entry had not been
            // applied yet (historical data).
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
        await notifyLowBalanceIfCrossed(walletMovement);
        return { success: "Entrée signée" };
    } catch (e) {
        if (e instanceof HobbsStartUnresolvedError) return { error: e.message };
        if (e instanceof AlreadySignedError) return { error: e.message };
        if (e instanceof WalletChargeError) return { error: e.message };
        return { error: "Erreur lors de la signature" };
    }
};

// ─── Deletion ───

export const deleteFlightLog = async (logID: string) => {
    const auth = await requireAuth(LOGBOOK_WRITE_ROLES);
    if ("error" in auth) return { error: auth.error };

    const log = await prisma.flight_logs.findUnique({ where: { id: logID } });
    if (!log) return { error: "Entrée introuvable" };

    if (log.clubID !== auth.user.clubID) return { error: "Permissions insuffisantes" };

    // A signed flight is locked: never deletable here (even OWNER/ADMIN must unsign
    // it first through a dedicated flow).
    if (log.pilotSigned) {
        return { error: "Impossible de supprimer une entrée signée" };
    }

    // Who can delete an UNSIGNED flight:
    //  - OWNER/ADMIN: any flight of their club;
    //  - the flight's own pilot: their own flight.
    const canOverride = SIGN_OVERRIDE_ROLES.includes(auth.user.role);
    if (!canOverride && auth.user.id !== log.pilotID) {
        return { error: "Permissions insuffisantes" };
    }

    try {
        await prisma.$transaction(async (tx) => {
            await tx.flight_logs.delete({ where: { id: logID } });

            // If the deleted entry was the last counter reading, roll back to its start:
            // otherwise a wrong end would stay in plane.hobbsTotal and pollute every
            // following flight.
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
// ─── Running totals ───

export const getRunningTotals = async (pilotID: string, clubID: string) => {
    const auth = await requireAuth(LOGBOOK_ROLES);
    if ("error" in auth) return { error: auth.error };

    try {
        const logs = await prisma.flight_logs.findMany({
            // 1 log per instruction flight: also sum the flights where the requested pilot
            // is the student (studentID); their function is 'EP' in the time computation.
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
            // Effective pilotFunction for this pilot:
            // - if they are the log's pilotID → stored function (I or P)
            // - otherwise they are the studentID → 'EP'
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

// ─── Current plane Hobbs ───

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

// Re-export of the helper for client components that need it. Server actions can
// only export async functions, hence the wrapper.
export async function getIsInstructorRole(role: userRole): Promise<boolean> {
    return isInstructorRole(role);
}

export async function getComputeDuration(
    hobbsStart: number | null,
    hobbsEnd: number | null
): Promise<number> {
    return computeDurationMinutes(hobbsStart, hobbsEnd);
}
