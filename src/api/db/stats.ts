"use server";

import { flightNature, pilotFunction, Prisma, userRole } from "@prisma/client";
import prisma from "../prisma";
import { requireAuth } from "./users";
import { CLUB_MANAGEMENT_ROLES } from "@/lib/clubAccess";
import { canManageWallet, WALLET_HIDDEN_ROLES, WALLET_MANAGE_ROLES } from "@/lib/wallet";
import {
    clubDay,
    computeActivity,
    computeFlightStats,
    computeWalletStats,
    DayRange,
    FlightStats,
    instantBounds,
    isStatsPeriod,
    monthBuckets,
    RankRow,
    resolvePeriodWindow,
    StatLog,
    StatsPeriod,
    StatTransaction,
    toStatLog,
    windowBounds,
} from "@/lib/clubStats";

/**
 * "Club" page statistics (AER-68). Read-only.
 *
 * Isolation: the club is ALWAYS the signed-in user's (auth.user.clubID), never a
 * client parameter. Personal statistics only cover the signed-in user's flights.
 *
 * Hours come from the logbook (flight_logs), no longer from bookings, which also
 * counted cancelled or unflown slots.
 */

const LOG_SELECT = {
    date: true,
    hobbsStart: true,
    hobbsEnd: true,
    planeName: true,
    planeRegistration: true,
    flightNature: true,
    pilotID: true,
    pilotFirstName: true,
    pilotLastName: true,
    pilotFunction: true,
    instructorID: true,
    instructorFirstName: true,
    instructorLastName: true,
    studentID: true,
    studentFirstName: true,
    studentLastName: true,
} as const;

const NO_CLUB = { error: "Aucun club associé à votre compte." };
const STATS_ERROR = { error: "Erreur lors du calcul des statistiques" };

const parsePeriod = (period: unknown): StatsPeriod => (isStatsPeriod(period) ? period : "month");

async function loadLogs(where: Prisma.flight_logsWhereInput, range: DayRange): Promise<StatLog[]> {
    const rows = await prisma.flight_logs.findMany({
        where: { ...where, date: { gte: range.from, lte: range.to } },
        select: LOG_SELECT,
    });
    return rows.map(toStatLog);
}

async function loadTransactions(clubID: string, range: DayRange): Promise<StatTransaction[]> {
    const rows = await prisma.walletTransaction.findMany({
        where: { clubID, createdAt: instantBounds(range) },
        select: { createdAt: true, type: true, amountCents: true, flightLogID: true, userID: true, planeName: true, planeRegistration: true },
    });
    return rows.map(({ createdAt, ...t }) => ({ ...t, day: clubDay(createdAt) }));
}

const memberLabel = (m: { firstName: string; lastName: string }) =>
    `${m.lastName.toUpperCase()} ${m.firstName.charAt(0).toUpperCase()}.`;

/** Overdrawn members, same population as the wallet list. */
async function loadOverdraft(clubID: string) {
    const [members, wallets] = await Promise.all([
        prisma.user.findMany({ where: { clubID, role: { notIn: WALLET_HIDDEN_ROLES } }, select: { id: true } }),
        prisma.wallet.findMany({ where: { clubID, balanceCents: { lt: 0 } }, select: { userID: true, balanceCents: true } }),
    ]);
    const ids = new Set(members.map((m) => m.id));
    const overdrawn = wallets.filter((w) => ids.has(w.userID));
    return {
        overdraftCount: overdrawn.length,
        totalDueCents: overdrawn.reduce((sum, w) => sum + w.balanceCents, 0),
    };
}

// ─── Management: club flight statistics ───

export const getClubFlightStats = async (period: StatsPeriod) => {
    const auth = await requireAuth(CLUB_MANAGEMENT_ROLES);
    if ("error" in auth) return { error: auth.error };
    const clubID = auth.user.clubID;
    if (!clubID) return NO_CLUB;

    const window = resolvePeriodWindow(parsePeriod(period), clubDay(new Date()));
    try {
        const logs = await loadLogs({ clubID }, windowBounds(window));
        return { success: true as const, stats: computeFlightStats(logs, window) };
    } catch {
        return STATS_ERROR;
    }
};

// ─── Management: wallet statistics ───

export const getClubWalletStats = async (period: StatsPeriod) => {
    const auth = await requireAuth(WALLET_MANAGE_ROLES);
    if ("error" in auth) return { error: auth.error };
    const clubID = auth.user.clubID;
    if (!clubID) return NO_CLUB;

    const club = await prisma.club.findUnique({ where: { id: clubID }, select: { walletEnabled: true } });
    if (!club?.walletEnabled) return { error: "Le portefeuille n'est pas activé pour ce club." };

    const window = resolvePeriodWindow(parsePeriod(period), clubDay(new Date()));
    try {
        const [txs, overdraft] = await Promise.all([loadTransactions(clubID, windowBounds(window)), loadOverdraft(clubID)]);
        const ids = Array.from(new Set(txs.map((t) => t.userID)));
        const members = ids.length
            ? await prisma.user.findMany({ where: { id: { in: ids }, clubID }, select: { id: true, firstName: true, lastName: true } })
            : [];
        const names = new Map(members.map((m) => [m.id, memberLabel(m)]));
        return {
            success: true as const,
            stats: computeWalletStats(txs, window, (id) => names.get(id) ?? "Ancien membre"),
            ...overdraft,
        };
    } catch {
        return STATS_ERROR;
    }
};

// ─── Management: month overview ───

export interface ClubOverview {
    currentLabel: string;
    comparisonLabel: string;
    flights: {
        minutes: number;
        previousMinutes: number;
        flights: number;
        previousFlights: number;
        students: number;
        previousStudents: number;
        topPlane: RankRow | null;
    };
    // null if the wallet is disabled.
    wallet: {
        cashedCents: number;
        previousCashedCents: number;
        billedCents: number;
        previousBilledCents: number;
        totalDueCents: number;
        overdraftCount: number;
    } | null;
    activity: { label: string; minutes: number; cashedCents: number }[];
}

export const getClubOverview = async () => {
    const auth = await requireAuth(CLUB_MANAGEMENT_ROLES);
    if ("error" in auth) return { error: auth.error };
    const clubID = auth.user.clubID;
    if (!clubID) return NO_CLUB;

    const today = clubDay(new Date());
    const window = resolvePeriodWindow("month", today);
    const activityBuckets = monthBuckets(today.getUTCFullYear(), today.getUTCMonth(), 6);
    const bounds = windowBounds(window);
    const range: DayRange = {
        from: new Date(Math.min(bounds.from.getTime(), activityBuckets[0].from.getTime())),
        to: bounds.to,
    };

    try {
        const club = await prisma.club.findUnique({ where: { id: clubID }, select: { walletEnabled: true } });
        const withWallet = !!club?.walletEnabled && canManageWallet(auth.user.role);

        const [logs, txs, overdraft] = await Promise.all([
            loadLogs({ clubID }, range),
            withWallet ? loadTransactions(clubID, range) : Promise.resolve([] as StatTransaction[]),
            withWallet ? loadOverdraft(clubID) : Promise.resolve(null),
        ]);

        const flight = computeFlightStats(logs, window);
        const wallet = withWallet ? computeWalletStats(txs, window, () => "") : null;

        const overview: ClubOverview = {
            currentLabel: window.currentLabel,
            comparisonLabel: window.comparisonLabel,
            flights: {
                minutes: flight.minutes,
                previousMinutes: flight.previousMinutes,
                flights: flight.flights,
                previousFlights: flight.previousFlights,
                students: flight.students,
                previousStudents: flight.previousStudents,
                topPlane: flight.byPlane[0] ?? null,
            },
            wallet: wallet && overdraft
                ? {
                    cashedCents: wallet.cashed.total,
                    previousCashedCents: wallet.cashed.previousTotal,
                    billedCents: wallet.billed.total,
                    previousBilledCents: wallet.billed.previousTotal,
                    ...overdraft,
                }
                : null,
            activity: computeActivity(logs, txs, activityBuckets),
        };
        return { success: true as const, overview };
    } catch {
        return STATS_ERROR;
    }
};

// ─── Personal statistics ───

/**
 * Flights of the signed-in user (student, pilot): those where they are the
 * recorded pilot or the student (1 row per instruction flight).
 */
export const getMyFlightStats = async (period: StatsPeriod) => {
    const auth = await requireAuth();
    if ("error" in auth) return { error: auth.error };
    const clubID = auth.user.clubID;
    if (!clubID) return NO_CLUB;

    const window = resolvePeriodWindow(parsePeriod(period), clubDay(new Date()));
    try {
        const logs = await loadLogs(
            { clubID, OR: [{ pilotID: auth.user.id }, { studentID: auth.user.id }] },
            windowBounds(window)
        );
        const stats: FlightStats = { ...computeFlightStats(logs, window), byInstructor: [], byStudent: [] };
        return { success: true as const, stats };
    } catch {
        return STATS_ERROR;
    }
};

/**
 * Instruction flights given by the signed-in instructor: those where they are
 * the recorded instructor, or the recorded pilot with function "I".
 */
export const getMyInstructionStats = async (period: StatsPeriod) => {
    const auth = await requireAuth([userRole.INSTRUCTOR, ...CLUB_MANAGEMENT_ROLES]);
    if ("error" in auth) return { error: auth.error };
    const clubID = auth.user.clubID;
    if (!clubID) return NO_CLUB;

    const window = resolvePeriodWindow(parsePeriod(period), clubDay(new Date()));
    try {
        const logs = await loadLogs(
            {
                clubID,
                flightNature: flightNature.INSTRUCTION,
                OR: [{ instructorID: auth.user.id }, { pilotID: auth.user.id, pilotFunction: pilotFunction.I }],
            },
            windowBounds(window)
        );
        const stats: FlightStats = { ...computeFlightStats(logs, window), byInstructor: [] };
        return { success: true as const, stats };
    } catch {
        return STATS_ERROR;
    }
};
