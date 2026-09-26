"use server";

import { userRole, WalletTransaction, WalletTransactionType } from "@prisma/client";
import prisma from "../prisma";
import { requireAuth } from "./users";
import { applyWalletMovement, getClubLowThresholdCents, notifyLowBalanceIfCrossed } from "../walletLedger";
import {
    balanceState,
    BalanceState,
    canManageWallet,
    canOperateMemberWallet,
    canViewClubWallets,
    canViewMemberWallet,
    isOverdrawn,
    operationToMovement,
    resolveWalletTarget,
    resolveFlightRate,
    resolvePayerID,
    WALLET_HIDDEN_ROLES,
} from "@/lib/wallet";
import { walletOperationSchema, WalletOperationInput } from "@/schemas/wallet";
import { clubPeriodStart } from "@/lib/clubTime";

/**
 * Student wallet server actions (AER-66).
 *
 * Isolation: the club is ALWAYS the signed-in user's (auth.user.clubID), never a
 * client parameter. Every targeted member is re-read from the DB and must belong
 * to that club.
 */

const PAGE_SIZE = 20;

// Uniform failure: the client can tell it apart via `res.success`, and it stays
// compatible with the `'error' in res` convention.
const fail = (error: string | undefined) => ({ success: false as const, error: error ?? "Erreur inconnue" });

export interface WalletContact {
    firstNameContact: string | null;
    lastNameContact: string | null;
    mailContact: string | null;
    phoneContact: string | null;
}

export interface WalletMemberRow {
    id: string;
    firstName: string;
    lastName: string;
    role: userRole;
    balanceCents: number;
    state: BalanceState;
    lastOperation: { type: WalletTransactionType; authorID: string | null; createdAt: Date } | null;
}

export interface WalletTotals {
    overdraftCount: number; // overdrawn members (balance < 0)
    totalDueCents: number; // sum of negative balances
    cashedThisMonthCents: number;
}

export interface WalletPeriodSummary {
    paidCents: number;
    paymentCount: number;
    flightsCents: number; // net amount of flights (debits + corrections), negative
    flightCount: number;
    flightMinutes: number;
}

export interface WalletTransactionView extends WalletTransaction {
    authorName: string | null;
}

// Loads the signed-in user and their club; refuses if the wallet is disabled.
async function loadContext(allowedRoles?: userRole[]) {
    const auth = await requireAuth(allowedRoles);
    if ("error" in auth) return { error: auth.error as string };
    if (!auth.user.clubID) return fail("Aucun club associé à votre compte.");

    const club = await prisma.club.findUnique({ where: { id: auth.user.clubID } });
    if (!club) return fail("Club introuvable.");
    if (!club.walletEnabled) return fail("Le portefeuille n'est pas activé pour ce club.");
    return { user: auth.user, club };
}

async function getBalance(clubID: string, userID: string): Promise<number> {
    const wallet = await prisma.wallet.findUnique({
        where: { clubID_userID: { clubID, userID } },
        select: { balanceCents: true },
    });
    return wallet?.balanceCents ?? 0;
}

// Start of the month in club time (not server time, which is UTC on Vercel).
function startOfMonth(now = new Date()): Date {
    return clubPeriodStart(now, "month");
}

async function withAuthorNames(list: WalletTransaction[]): Promise<WalletTransactionView[]> {
    const ids = Array.from(new Set(list.map((t) => t.authorID).filter((id): id is string => !!id)));
    const authors = ids.length
        ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true } })
        : [];
    const names = new Map(authors.map((a) => [a.id, `${a.firstName.charAt(0)}. ${a.lastName.toUpperCase()}`]));
    return list.map((t) => ({ ...t, authorName: t.authorID ? names.get(t.authorID) ?? null : null }));
}

async function periodSummary(clubID: string, userID: string, from: Date): Promise<WalletPeriodSummary> {
    const list = await prisma.walletTransaction.findMany({
        where: { clubID, userID, createdAt: { gte: from } },
        select: { type: true, amountCents: true, flightLogID: true, durationMin: true, authorID: true },
    });
    const summary: WalletPeriodSummary = { paidCents: 0, paymentCount: 0, flightsCents: 0, flightCount: 0, flightMinutes: 0 };
    for (const t of list) {
        if (t.type === WalletTransactionType.CREDIT) {
            summary.paidCents += t.amountCents;
            summary.paymentCount += 1;
        } else if (t.flightLogID) {
            summary.flightsCents += t.amountCents;
            if (t.type === WalletTransactionType.DEBIT) {
                summary.flightCount += 1;
                summary.flightMinutes += t.durationMin ?? 0;
            }
        }
    }
    return summary;
}

async function transactionsPage(clubID: string, userID: string, page: number) {
    const safePage = Math.max(0, Math.floor(page));
    const rows = await prisma.walletTransaction.findMany({
        where: { clubID, userID },
        orderBy: { createdAt: "desc" },
        skip: safePage * PAGE_SIZE,
        take: PAGE_SIZE + 1,
    });
    return { transactions: await withAuthorNames(rows.slice(0, PAGE_SIZE)), hasMore: rows.length > PAGE_SIZE };
}

// ─── Lightweight status (navigation, calendar, profile) ───

/**
 * Balance of the signed-in user. `enabled: false` if the club has not enabled
 * the wallet (the UI then shows nothing).
 */
export const getMyWalletStatus = async () => {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error);
    if (!auth.user.clubID) return { success: true as const, enabled: false as const };

    const club = await prisma.club.findUnique({
        where: { id: auth.user.clubID },
        select: { walletEnabled: true },
    });
    if (!club?.walletEnabled) return { success: true as const, enabled: false as const };

    const [balanceCents, threshold] = await Promise.all([
        getBalance(auth.user.clubID, auth.user.id),
        getClubLowThresholdCents(auth.user.clubID),
    ]);
    return {
        success: true as const,
        enabled: true as const,
        balanceCents,
        lowThresholdCents: threshold,
        state: balanceState(balanceCents, threshold),
    };
};

// ─── Member wallet (own, or a club member's for management) ───

/**
 * Wallet details. STUDENT / PILOT (and any role without viewing rights) ALWAYS
 * get their own wallet, whatever `userID` is.
 */
export const getMemberWallet = async (userID: string | null, page = 0) => {
    const ctx = await loadContext();
    if ("error" in ctx) return fail(ctx.error);
    const { user, club } = ctx;

    const targetID = resolveWalletTarget(user, userID);
    const target = targetID === user.id
        ? user
        : await prisma.user.findUnique({ where: { id: targetID } });
    if (!target || !canViewMemberWallet(user, target)) {
        return fail("Permissions insuffisantes");
    }

    const now = new Date();
    const [balanceCents, threshold, txPage, month, year] = await Promise.all([
        getBalance(club.id, target.id),
        getClubLowThresholdCents(club.id),
        transactionsPage(club.id, target.id, page),
        periodSummary(club.id, target.id, startOfMonth(now)),
        periodSummary(club.id, target.id, clubPeriodStart(now, "year")),
    ]);

    const isSelf = target.id === user.id;
    return {
        success: true as const,
        isSelf,
        canOperate: canOperateMemberWallet(user, target),
        member: {
            id: target.id,
            firstName: target.firstName,
            lastName: target.lastName,
            role: target.role,
            // contact details: useful for management to follow up, useless for oneself
            email: isSelf ? null : target.email,
            phone: isSelf ? null : target.phone,
        },
        balanceCents,
        lowThresholdCents: threshold,
        state: balanceState(balanceCents, threshold),
        month,
        year,
        ...txPage,
        contact: {
            firstNameContact: club.firstNameContact,
            lastNameContact: club.lastNameContact,
            mailContact: club.mailContact,
            phoneContact: club.phoneContact,
        } satisfies WalletContact,
    };
};

// ─── Club wallet list (instructor: read-only, management) ───

export const getClubWallets = async () => {
    const ctx = await loadContext();
    if ("error" in ctx) return fail(ctx.error);
    const { user, club } = ctx;
    if (!canViewClubWallets(user.role)) return fail("Permissions insuffisantes");

    const [members, wallets, lastOps, threshold] = await Promise.all([
        prisma.user.findMany({
            where: { clubID: club.id, role: { notIn: WALLET_HIDDEN_ROLES } },
            select: { id: true, firstName: true, lastName: true, role: true },
        }),
        prisma.wallet.findMany({ where: { clubID: club.id }, select: { userID: true, balanceCents: true } }),
        prisma.walletTransaction.findMany({
            where: { clubID: club.id },
            orderBy: { createdAt: "desc" },
            distinct: ["userID"],
            select: { userID: true, type: true, authorID: true, createdAt: true },
        }),
        getClubLowThresholdCents(club.id),
    ]);

    const balances = new Map(wallets.map((w) => [w.userID, w.balanceCents]));
    const lastByUser = new Map(lastOps.map((o) => [o.userID, o]));

    const rows: WalletMemberRow[] = members
        .map((m) => {
            const balanceCents = balances.get(m.id) ?? 0;
            const last = lastByUser.get(m.id);
            return {
                ...m,
                balanceCents,
                state: balanceState(balanceCents, threshold),
                lastOperation: last ? { type: last.type, authorID: last.authorID, createdAt: last.createdAt } : null,
            };
        })
        .sort((a, b) => a.balanceCents - b.balanceCents || a.lastName.localeCompare(b.lastName));

    let totals: WalletTotals | null = null;
    if (canManageWallet(user.role)) {
        const cashed = await prisma.walletTransaction.aggregate({
            where: { clubID: club.id, type: WalletTransactionType.CREDIT, createdAt: { gte: startOfMonth() } },
            _sum: { amountCents: true },
        });
        totals = {
            overdraftCount: rows.filter((r) => isOverdrawn(r.balanceCents)).length,
            totalDueCents: rows.reduce((sum, r) => sum + Math.min(0, r.balanceCents), 0),
            cashedThisMonthCents: cashed._sum.amountCents ?? 0,
        };
    }

    return {
        success: true as const,
        canOperate: canManageWallet(user.role),
        rows,
        totals,
        lowThresholdCents: threshold,
        hasAnyTransaction: lastOps.length > 0,
    };
};

// ─── Manual operation (management) ───

export const recordWalletOperation = async (input: WalletOperationInput) => {
    const ctx = await loadContext();
    if ("error" in ctx) return fail(ctx.error);
    const { user, club } = ctx;
    if (!canManageWallet(user.role)) return fail("Permissions insuffisantes");

    const parsed = walletOperationSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Saisie invalide.");
    const data = parsed.data;

    const target = await prisma.user.findUnique({
        where: { id: data.memberID },
        select: { id: true, clubID: true, firstName: true, lastName: true },
    });
    if (!target || !canOperateMemberWallet(user, target)) {
        return fail("Ce membre n'appartient pas à votre club.");
    }

    try {
        const movement = await prisma.$transaction((tx) =>
            applyWalletMovement(tx, {
                clubID: club.id,
                userID: target.id,
                ...operationToMovement(data.kind, data.amountCents),
                paymentMethod: data.paymentMethod ?? null,
                comment: data.comment || null,
                authorID: user.id,
            })
        );
        await notifyLowBalanceIfCrossed(movement);
        return {
            success: data.kind === "CREDIT" ? "Paiement enregistré" : "Retrait enregistré",
            memberName: `${target.firstName} ${target.lastName.toUpperCase()}`,
            amountCents: data.amountCents,
            balanceCents: movement.afterCents,
        };
    } catch {
        return fail("Erreur lors de l'enregistrement de l'opération.");
    }
};

// ─── Logbook: payer balance (preview) and debits of a signed flight ───

/**
 * Pre-signature preview: rate applicable to the plane (same rule as the actual
 * debit, see resolveFlightRate) and the payer's balance if viewable (self, or
 * instructor / management). The amount is computed client-side from the entered
 * Hobbs with computeFlightChargeCents.
 */
export const getFlightChargeQuote = async (planeID: string, payerID: string) => {
    const ctx = await loadContext();
    if ("error" in ctx) return fail(ctx.error);
    const { user, club } = ctx;

    const [plane, payer] = await Promise.all([
        prisma.planes.findUnique({ where: { id: planeID } }),
        payerID === user.id ? user : prisma.user.findUnique({ where: { id: payerID } }),
    ]);
    if (!plane || plane.clubID !== club.id || !payer || payer.clubID !== club.id) {
        return fail("Permissions insuffisantes");
    }

    const canSeeBalance = canViewMemberWallet(user, payer);
    return {
        success: true as const,
        rate: resolveFlightRate(plane, club),
        planeLabel: `${plane.name} ${plane.immatriculation}`,
        payerName: `${payer.firstName} ${payer.lastName.toUpperCase()}`,
        isSelf: payer.id === user.id,
        balanceCents: canSeeBalance ? await getBalance(club.id, payer.id) : null,
    };
};

/** Movements linked to a flight (debit + corrections), shown on a signed flight. */
export const getFlightLogCharges = async (logID: string) => {
    const ctx = await loadContext();
    if ("error" in ctx) return fail(ctx.error);
    const { user, club } = ctx;

    const log = await prisma.flight_logs.findUnique({
        where: { id: logID },
        select: { clubID: true, pilotID: true, instructorID: true, studentID: true },
    });
    if (!log || log.clubID !== club.id) return fail("Permissions insuffisantes");

    const payerID = resolvePayerID(log);
    const isInvolved = user.id === log.pilotID || user.id === payerID;
    if (!isInvolved && !canViewClubWallets(user.role)) return fail("Permissions insuffisantes");

    const movements = await prisma.walletTransaction.findMany({
        where: { flightLogID: logID, clubID: club.id },
        orderBy: { createdAt: "asc" },
    });
    const payer = payerID
        ? await prisma.user.findUnique({ where: { id: payerID }, select: { firstName: true, lastName: true } })
        : null;
    return {
        success: true as const,
        movements,
        payerName: payer ? `${payer.firstName} ${payer.lastName.toUpperCase()}` : null,
    };
};

// ─── Flights page: member balances for management bookings ───

export const getMemberBalances = async () => {
    const ctx = await loadContext();
    if ("error" in ctx) return fail(ctx.error);
    const { user, club } = ctx;
    if (!canViewClubWallets(user.role)) return fail("Permissions insuffisantes");

    const wallets = await prisma.wallet.findMany({
        where: { clubID: club.id },
        select: { userID: true, balanceCents: true },
    });
    return {
        success: true as const,
        balances: Object.fromEntries(wallets.map((w) => [w.userID, w.balanceCents])) as Record<string, number>,
    };
};
