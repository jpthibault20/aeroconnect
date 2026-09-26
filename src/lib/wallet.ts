import {
    flightNature,
    instructionSubType,
    MachineUsage,
    PaymentMethod,
    planes,
    userRole,
    WalletRateSource,
    WalletTransactionType,
} from "@prisma/client";
import { isPrivatePlane } from "@/lib/planeVisibility";
import { computeDurationMinutes } from "@/lib/logbookCalc";

/**
 * Pure, tested rules of the student wallet (AER-66).
 *
 * Shared by the UI (debit preview before signing) and the server (actual debit):
 * the same computation on both sides, never a one-cent difference. All amounts
 * are integer CENTS.
 *
 * These helpers do not replace the server guards: every server action keeps its
 * `requireAuth` and its clubID check.
 */

// ─── Roles ───

// Credit / adjust a wallet and see the club's financial totals.
export const WALLET_MANAGE_ROLES: userRole[] = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER];
// View club members' wallets (read-only for INSTRUCTOR).
export const WALLET_VIEW_ROLES: userRole[] = [...WALLET_MANAGE_ROLES, userRole.INSTRUCTOR];
// Roles blocked from booking when their balance is zero or negative.
export const WALLET_BOOKING_GATED_ROLES: userRole[] = [userRole.STUDENT, userRole.PILOT];
// Roles never listed in wallet management (non-member / platform admin).
export const WALLET_HIDDEN_ROLES: userRole[] = [userRole.USER, userRole.ADMIN];

export function canManageWallet(role: userRole | null | undefined): boolean {
    return role != null && WALLET_MANAGE_ROLES.includes(role);
}

export function canViewClubWallets(role: userRole | null | undefined): boolean {
    return role != null && WALLET_VIEW_ROLES.includes(role);
}

export function isBookingGatedRole(role: userRole | null | undefined): boolean {
    return role != null && WALLET_BOOKING_GATED_ROLES.includes(role);
}

interface WalletViewer {
    id: string;
    role: userRole;
    clubID: string | null;
}

/**
 * Can the viewer see `target`'s wallet? Always within the same club; their own
 * wallet, or any member for the viewing roles (instructor + management).
 */
export function canViewMemberWallet(
    viewer: WalletViewer,
    target: { id: string; clubID: string | null }
): boolean {
    if (!viewer.clubID || viewer.clubID !== target.clubID) return false;
    if (viewer.id === target.id) return true;
    return canViewClubWallets(viewer.role);
}

/** Can the viewer credit / adjust `target`'s wallet? */
export function canOperateMemberWallet(
    viewer: WalletViewer,
    target: { clubID: string | null }
): boolean {
    if (!viewer.clubID || viewer.clubID !== target.clubID) return false;
    return canManageWallet(viewer.role);
}

// ─── Flight billing ───

interface BillableLog {
    flightNature: flightNature;
    instructionSubType: instructionSubType | null;
}

/**
 * Debited flight: any instruction except discovery flights (LOCAL, NAVIGATION,
 * LACHE, EXAM).
 */
export function isBillableFlight(log: BillableLog): boolean {
    return log.flightNature === flightNature.INSTRUCTION
        && log.instructionSubType !== instructionSubType.BAPTEME;
}

interface PayerLog {
    pilotID: string;
    instructorID: string | null;
    studentID: string | null;
}

/**
 * Who pays for the flight, whatever their role:
 *  - flight entered by the instructor: the student (studentID);
 *  - flight entered by a pilot with their instructor (instructorID): the pilot.
 * null => nobody to debit (e.g. an external passenger's discovery flight).
 */
export function resolvePayerID(log: PayerLog): string | null {
    if (log.studentID) return log.studentID;
    if (log.instructorID) return log.pilotID;
    return null;
}

export type FlightRateError = "MISSING_PLANE_RATE" | "MISSING_INSTRUCTOR_RATE";

export type FlightRate =
    | { ok: true; rateCents: number; source: WalletRateSource }
    | { ok: false; error: FlightRateError; message: string };

/**
 * Applicable hourly rate:
 *  - club plane: its instruction rate (instructor included);
 *  - private plane (the student's or someone else's): the club's instructor rate.
 */
export function resolveFlightRate(
    plane: Pick<planes, "ownerID" | "instructionHourlyRateCents" | "name" | "immatriculation">,
    club: { instructorHourlyRateCents: number | null }
): FlightRate {
    if (isPrivatePlane(plane)) {
        if (club.instructorHourlyRateCents == null) {
            return {
                ok: false,
                error: "MISSING_INSTRUCTOR_RATE",
                message: "Le tarif horaire instructeur du club n'est pas renseigné (Club › Paramètres). Le vol peut être enregistré mais pas signé.",
            };
        }
        return { ok: true, rateCents: club.instructorHourlyRateCents, source: WalletRateSource.INSTRUCTOR };
    }
    if (plane.instructionHourlyRateCents == null) {
        return {
            ok: false,
            error: "MISSING_PLANE_RATE",
            message: `La machine ${plane.name} (${plane.immatriculation}) n'a pas de tarif écolage. Le président doit le renseigner dans Avions › Modifier. Le vol peut être enregistré mais pas signé.`,
        };
    }
    return { ok: true, rateCents: plane.instructionHourlyRateCents, source: WalletRateSource.PLANE };
}

/** Flight amount: hourly rate pro rata to the minutes, rounded to the cent. */
export function computeFlightChargeCents(minutes: number, rateCents: number): number {
    if (minutes <= 0 || rateCents <= 0) return 0;
    return Math.round((rateCents * minutes) / 60);
}

/**
 * Adjustment of an already debited then corrected flight: what it should have
 * cost at the rate FROZEN at the original debit, minus what was already charged
 * (signed sum of the flight's movements). > 0: refund; < 0: extra debit.
 */
export function computeFlightAdjustmentCents(args: {
    billable: boolean;
    durationMin: number;
    frozenRateCents: number;
    movementsSumCents: number; // negative: already charged
}): number {
    const expected = args.billable ? computeFlightChargeCents(args.durationMin, args.frozenRateCents) : 0;
    const alreadyCharged = -args.movementsSumCents;
    return alreadyCharged - expected;
}

export type FlightChargePlan =
    | { action: "skip"; reason: "WALLET_DISABLED" | "NOT_BILLABLE" | "NO_PAYER" }
    | { action: "reject"; message: string }
    | {
        action: "charge";
        payerID: string;
        amountCents: number; // positive: amount to debit
        durationMin: number;
        rateCents: number;
        rateSource: WalletRateSource;
    };

export interface FlightChargeInput {
    walletEnabled: boolean;
    log: BillableLog & PayerLog & {
        clubID: string;
        planeID: string | null;
        hobbsStart: number | null;
        hobbsEnd: number | null;
    };
    /** Payer re-read from the DB (null: not found). */
    payer: { clubID: string | null } | null;
    /** Plane re-read from the DB (null: not found or flight without a plane). */
    plane: (Pick<planes, "ownerID" | "instructionHourlyRateCents" | "name" | "immatriculation"> & { clubID: string }) | null;
    club: { instructorHourlyRateCents: number | null };
}

/**
 * Debit decision for a flight when signed (AER-66), without DB access: the ledger
 * (walletLedger.chargeSignedFlight) re-reads payer / plane / club then applies
 * this plan. Rule order:
 *  1. wallet disabled, flight not billable or no payer => nothing;
 *  2. payer or plane outside the flight's club, missing plane, missing rate =>
 *     refusal (the signature is rolled back);
 *  3. otherwise debit pro rata to the Hobbs hours.
 */
export function planFlightCharge({ walletEnabled, log, payer, plane, club }: FlightChargeInput): FlightChargePlan {
    if (!walletEnabled) return { action: "skip", reason: "WALLET_DISABLED" };
    if (!isBillableFlight(log)) return { action: "skip", reason: "NOT_BILLABLE" };
    const payerID = resolvePayerID(log);
    if (!payerID) return { action: "skip", reason: "NO_PAYER" };

    if (!payer || payer.clubID !== log.clubID) {
        return { action: "reject", message: "Le membre à débiter n'appartient pas au club de ce vol." };
    }
    if (!log.planeID) {
        return { action: "reject", message: "Machine inconnue : impossible de calculer le débit du vol." };
    }
    if (!plane || plane.clubID !== log.clubID) {
        return { action: "reject", message: "Machine introuvable dans ce club : impossible de calculer le débit du vol." };
    }

    const rate = resolveFlightRate(plane, club);
    if (!rate.ok) return { action: "reject", message: rate.message };

    const durationMin = computeDurationMinutes(log.hobbsStart, log.hobbsEnd);
    return {
        action: "charge",
        payerID,
        amountCents: computeFlightChargeCents(durationMin, rate.rateCents),
        durationMin,
        rateCents: rate.rateCents,
        rateSource: rate.source,
    };
}

// ─── Booking / viewing / operations ───

export interface WalletContactInfo {
    firstNameContact: string | null;
    lastNameContact: string | null;
    mailContact: string | null;
    phoneContact: string | null;
}

/**
 * Self-booking: blocking message if it is a student / pilot with a balance ≤ 0
 * in a club with the wallet enabled, null otherwise.
 */
export function bookingWalletBlock(args: {
    walletEnabled: boolean;
    role: userRole;
    balanceCents: number;
    contact: WalletContactInfo;
}): string | null {
    if (!args.walletEnabled || !isBookingGatedRole(args.role)) return null;
    return canBookWithBalance(args.balanceCents) ? null : bookingBlockedMessage(args.balanceCents, args.contact);
}

/**
 * Booking of a student by management: never blocked, but a warning if the
 * student / pilot (same club) has a balance ≤ 0. null otherwise.
 */
export function managerBookingWarning(args: {
    walletEnabled: boolean;
    clubID: string;
    member: { clubID: string | null; role: userRole; firstName: string; lastName: string } | null;
    balanceCents: number;
}): string | null {
    const { walletEnabled, clubID, member, balanceCents } = args;
    if (!walletEnabled || !member || member.clubID !== clubID || !isBookingGatedRole(member.role)) return null;
    if (canBookWithBalance(balanceCents)) return null;
    return `Le solde de ${member.firstName} ${member.lastName.toUpperCase()} est de ${formatCents(balanceCents)}. L'inscription est enregistrée et le vol sera débité à la signature : pensez à régulariser avec l'élève.`;
}

/**
 * Wallet actually viewed: a role without viewing rights (student, pilot…)
 * ALWAYS gets their own, whatever the requested ID.
 */
export function resolveWalletTarget(viewer: { id: string; role: userRole }, requestedUserID: string | null): string {
    return requestedUserID && canViewClubWallets(viewer.role) ? requestedUserID : viewer.id;
}

/**
 * Manual operation -> recorded movement: a credit is a positive CREDIT, a
 * withdrawal a negative ADJUSTMENT. The entered amount is positive.
 */
export function operationToMovement(kind: "CREDIT" | "WITHDRAW", amountCents: number): { type: WalletTransactionType; amountCents: number } {
    return kind === "CREDIT"
        ? { type: WalletTransactionType.CREDIT, amountCents }
        : { type: WalletTransactionType.ADJUSTMENT, amountCents: -amountCents };
}

// ─── Balance state ───

export type BalanceState = "ok" | "low" | "empty";

/**
 * "Low balance" threshold: cost of one hour on the cheapest training plane (club
 * plane with INSTRUCTION usage) that has a rate. null => no rate configured, no
 * "low" state.
 */
export function computeLowThresholdCents(
    list: Pick<planes, "ownerID" | "usageTypes" | "instructionHourlyRateCents">[]
): number | null {
    const rates = list
        .filter((p) => !isPrivatePlane(p) && p.usageTypes.includes(MachineUsage.INSTRUCTION))
        .map((p) => p.instructionHourlyRateCents)
        .filter((r): r is number => r != null && r > 0);
    return rates.length > 0 ? Math.min(...rates) : null;
}

export function balanceState(balanceCents: number, lowThresholdCents: number | null): BalanceState {
    if (balanceCents <= 0) return "empty";
    if (lowThresholdCents != null && balanceCents < lowThresholdCents) return "low";
    return "ok";
}

/**
 * Did the balance just drop below the "low" threshold (depleted included)? Used
 * to send the email only once per crossing, with no state to store.
 */
export function crossedLowThreshold(
    beforeCents: number,
    afterCents: number,
    lowThresholdCents: number | null
): boolean {
    const wasLow = balanceState(beforeCents, lowThresholdCents) !== "ok";
    const isLow = balanceState(afterCents, lowThresholdCents) !== "ok";
    return !wasLow && isLow;
}

/**
 * Overdrawn = the member OWES the club money (strictly negative balance). At 0 €
 * they can no longer book, but they are not overdrawn.
 */
export function isOverdrawn(balanceCents: number): boolean {
    return balanceCents < 0;
}

/**
 * Color of a balance amount in lists: red if overdrawn, amber at 0 € (bookings
 * blocked), neutral otherwise.
 */
export function balanceTextClass(balanceCents: number): string {
    if (isOverdrawn(balanceCents)) return "text-red-600";
    if (balanceCents === 0) return "text-amber-600";
    return "text-slate-400";
}

/** Booking allowed (balance-wise): strictly positive. */
export function canBookWithBalance(balanceCents: number): boolean {
    return balanceCents > 0;
}

// ─── Formatting / input ───

const euroFormatter = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/** "45,00 €", "−12,50 €" (real minus sign, regular spaces). */
export function formatCents(cents: number): string {
    const formatted = euroFormatter.format(Math.abs(cents) / 100).replace(/[  ]/g, " ");
    return cents < 0 ? `−${formatted}` : formatted;
}

/** "+150,00 €" / "−90,00 €"; 0 without a sign. */
export function formatSignedCents(cents: number): string {
    if (cents > 0) return `+${formatCents(cents)}`;
    return formatCents(cents);
}

/** "120 €/h" or "120,50 €/h". */
export function formatHourlyRate(cents: number): string {
    const euros = cents / 100;
    const text = new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    }).format(euros).replace(/[  ]/g, " ");
    return `${text} €/h`;
}

/**
 * Converts a euro input ("150", "150,5", "1 200,00") to cents. null if the input
 * is not a valid amount with at most 2 decimals.
 */
export function parseEurosToCents(input: string): number | null {
    const normalized = input.trim().replace(/[\s  ]/g, "").replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
    const [whole, decimals = ""] = normalized.split(".");
    return Number(whole) * 100 + Number(decimals.padEnd(2, "0"));
}

/** Cents -> input field value ("120,00"), empty if null. */
export function centsToInput(cents: number | null | undefined): string {
    if (cents == null) return "";
    return (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * Hourly rate received from the client: integer cents ≥ 0, or null ("no rate").
 * undefined => invalid value, to be rejected.
 */
export function sanitizeRateCents(value: unknown): number | null | undefined {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 10_000_000) return undefined;
    return value;
}

/** 45 -> "0h45", 100 -> "1h40". */
export function formatDurationHM(minutes: number): string {
    const safe = Math.max(0, Math.round(minutes));
    return `${Math.floor(safe / 60)}h${String(safe % 60).padStart(2, "0")}`;
}

// Beyond this, a (non-blocking) warning asks to double-check the input.
export const UNUSUAL_AMOUNT_CENTS = 500_000;
export const QUICK_AMOUNTS_CENTS = [5_000, 10_000, 15_000, 20_000];

// ─── Labels ───

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    CASH: "Espèces",
    CHECK: "Chèque",
    TRANSFER: "Virement",
    CARD: "CB",
    OTHER: "Autre",
};

export const PAYMENT_METHODS: PaymentMethod[] = [
    PaymentMethod.CASH,
    PaymentMethod.CHECK,
    PaymentMethod.TRANSFER,
    PaymentMethod.CARD,
    PaymentMethod.OTHER,
];

/**
 * Label of an operation as seen by the user. An adjustment without an author is
 * an automatic correction of an edited signed flight.
 */
export function transactionLabel(type: WalletTransactionType, authorID: string | null): string {
    switch (type) {
        case WalletTransactionType.CREDIT: return "Paiement reçu";
        case WalletTransactionType.DEBIT: return "Vol d'instruction";
        case WalletTransactionType.ADJUSTMENT: return authorID ? "Ajustement" : "Correction de vol";
    }
}

export const BALANCE_STATE_LABELS: Record<BalanceState, string> = {
    ok: "Solde positif",
    low: "Solde faible : pensez à recharger votre compte",
    empty: "Solde épuisé : inscriptions aux créneaux bloquées",
};

/** Booking block message, with the club contact if any. */
export function bookingBlockedMessage(
    balanceCents: number,
    contact: { firstNameContact: string | null; lastNameContact: string | null; mailContact: string | null; phoneContact: string | null }
): string {
    const name = [contact.firstNameContact, contact.lastNameContact?.toUpperCase()].filter(Boolean).join(" ");
    const ways = [contact.phoneContact, contact.mailContact].filter(Boolean).join(" / ");
    const who = name || ways
        ? `Contactez ${name || "le club"}${ways ? ` (${ways})` : ""} pour recharger votre compte.`
        : "Adressez-vous au président ou à un instructeur du club pour recharger votre compte.";
    return `Votre solde est de ${formatCents(balanceCents)}. Pour vous inscrire à un créneau, il doit être positif. ${who}`;
}
