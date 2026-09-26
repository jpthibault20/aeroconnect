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
 * Règles (pures, testées) du portefeuille élève (AER-66).
 *
 * Partagées par l'UI (aperçu du débit avant signature) et par le serveur
 * (débit réel) : un même calcul des deux côtés, jamais d'écart d'un centime.
 * Tous les montants sont en CENTIMES entiers.
 *
 * Ces helpers ne remplacent pas les gardes serveur : chaque server action
 * garde son `requireAuth` et sa vérification de clubID.
 */

// ─── Rôles ───

// Créditer / ajuster un portefeuille et voir les totaux financiers du club.
export const WALLET_MANAGE_ROLES: userRole[] = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER];
// Consulter les portefeuilles des membres du club (lecture seule pour INSTRUCTOR).
export const WALLET_VIEW_ROLES: userRole[] = [...WALLET_MANAGE_ROLES, userRole.INSTRUCTOR];
// Rôles bloqués à l'inscription quand leur solde est nul ou négatif.
export const WALLET_BOOKING_GATED_ROLES: userRole[] = [userRole.STUDENT, userRole.PILOT];
// Rôles jamais listés dans la gestion des portefeuilles (non-membre / admin plateforme).
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
 * Le viewer peut-il consulter le portefeuille de `target` ? Toujours dans le
 * même club ; son propre portefeuille, ou n'importe quel membre pour les rôles
 * de consultation (instructeur + gestion).
 */
export function canViewMemberWallet(
    viewer: WalletViewer,
    target: { id: string; clubID: string | null }
): boolean {
    if (!viewer.clubID || viewer.clubID !== target.clubID) return false;
    if (viewer.id === target.id) return true;
    return canViewClubWallets(viewer.role);
}

/** Le viewer peut-il créditer / ajuster le portefeuille de `target` ? */
export function canOperateMemberWallet(
    viewer: WalletViewer,
    target: { clubID: string | null }
): boolean {
    if (!viewer.clubID || viewer.clubID !== target.clubID) return false;
    return canManageWallet(viewer.role);
}

// ─── Facturation d'un vol ───

interface BillableLog {
    flightNature: flightNature;
    instructionSubType: instructionSubType | null;
}

/** Vol débité : toute instruction sauf baptême (LOCAL, NAVIGATION, LACHE, EXAM). */
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
 * Qui paie le vol, quel que soit son rôle :
 *  - vol saisi par l'instructeur : l'élève (studentID) ;
 *  - vol saisi par un pilote avec son instructeur (instructorID) : le pilote.
 * null => personne à débiter (ex. baptême d'un passager externe).
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
 * Tarif horaire applicable :
 *  - machine du club : son tarif écolage (instructeur compris) ;
 *  - machine privée (de l'élève ou d'un autre) : le tarif instructeur du club.
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

/** Montant d'un vol : tarif horaire au prorata des minutes, arrondi au centime. */
export function computeFlightChargeCents(minutes: number, rateCents: number): number {
    if (minutes <= 0 || rateCents <= 0) return 0;
    return Math.round((rateCents * minutes) / 60);
}

/**
 * Régularisation d'un vol déjà débité puis corrigé : ce qu'il aurait dû coûter
 * au tarif FIGÉ du débit d'origine, moins ce qui a déjà été prélevé (somme
 * signée des mouvements du vol). > 0 : remboursement ; < 0 : débit en plus.
 */
export function computeFlightAdjustmentCents(args: {
    billable: boolean;
    durationMin: number;
    frozenRateCents: number;
    movementsSumCents: number; // négatif : déjà prélevé
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
        amountCents: number; // positif : montant à débiter
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
    /** Payeur relu en base (null : introuvable). */
    payer: { clubID: string | null } | null;
    /** Machine relue en base (null : introuvable ou vol sans machine). */
    plane: (Pick<planes, "ownerID" | "instructionHourlyRateCents" | "name" | "immatriculation"> & { clubID: string }) | null;
    club: { instructorHourlyRateCents: number | null };
}

/**
 * Décision du débit d'un vol à sa signature (AER-66), sans accès base : le
 * registre (walletLedger.chargeSignedFlight) relit payeur / machine / club
 * puis applique ce plan. Ordre des règles :
 *  1. portefeuille désactivé, vol non facturable ou sans payeur => rien ;
 *  2. payeur ou machine hors du club du vol, machine absente, tarif
 *     manquant => refus (la signature est annulée) ;
 *  3. sinon débit au prorata des heures moteur.
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

// ─── Inscription / consultation / opérations ───

export interface WalletContactInfo {
    firstNameContact: string | null;
    lastNameContact: string | null;
    mailContact: string | null;
    phoneContact: string | null;
}

/**
 * Inscription d'un utilisateur par lui-même : message de blocage si c'est un
 * élève / pilote à solde ≤ 0 dans un club au portefeuille activé, null sinon.
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
 * Inscription d'un élève par la gestion : jamais bloquée, mais avertissement
 * si l'élève / pilote (du même club) a un solde ≤ 0. null sinon.
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
 * Portefeuille réellement consulté : un rôle sans droit de consultation
 * (élève, pilote…) reçoit TOUJOURS le sien, quel que soit l'identifiant demandé.
 */
export function resolveWalletTarget(viewer: { id: string; role: userRole }, requestedUserID: string | null): string {
    return requestedUserID && canViewClubWallets(viewer.role) ? requestedUserID : viewer.id;
}

/**
 * Opération manuelle -> mouvement enregistré : un crédit est un CREDIT
 * positif, un retrait un ADJUSTMENT négatif. Le montant saisi est positif.
 */
export function operationToMovement(kind: "CREDIT" | "WITHDRAW", amountCents: number): { type: WalletTransactionType; amountCents: number } {
    return kind === "CREDIT"
        ? { type: WalletTransactionType.CREDIT, amountCents }
        : { type: WalletTransactionType.ADJUSTMENT, amountCents: -amountCents };
}

// ─── État du solde ───

export type BalanceState = "ok" | "low" | "empty";

/**
 * Seuil « solde faible » : coût d'une heure sur la machine d'école (machine du
 * club à usage INSTRUCTION) la moins chère ayant un tarif. null => aucun tarif
 * configuré, pas d'état « faible ».
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
 * Le solde vient-il de passer sous le seuil « faible » (épuisé inclus) ? Sert à
 * n'envoyer l'e-mail qu'une fois par passage, sans état à stocker.
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
 * À découvert = le membre DOIT de l'argent au club (solde strictement
 * négatif). À 0 € il ne peut plus s'inscrire, mais il n'est pas à découvert.
 */
export function isOverdrawn(balanceCents: number): boolean {
    return balanceCents < 0;
}

/**
 * Couleur d'un montant de solde dans les listes : rouge si à découvert,
 * ambre à 0 € (inscriptions bloquées), neutre sinon.
 */
export function balanceTextClass(balanceCents: number): string {
    if (isOverdrawn(balanceCents)) return "text-red-600";
    if (balanceCents === 0) return "text-amber-600";
    return "text-slate-400";
}

/** Inscription autorisée (côté solde) : strictement positif. */
export function canBookWithBalance(balanceCents: number): boolean {
    return balanceCents > 0;
}

// ─── Formatage / saisie ───

const euroFormatter = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/** « 45,00 € », « −12,50 € » (vrai signe moins, espaces normales). */
export function formatCents(cents: number): string {
    const formatted = euroFormatter.format(Math.abs(cents) / 100).replace(/[  ]/g, " ");
    return cents < 0 ? `−${formatted}` : formatted;
}

/** « +150,00 € » / « −90,00 € » ; 0 sans signe. */
export function formatSignedCents(cents: number): string {
    if (cents > 0) return `+${formatCents(cents)}`;
    return formatCents(cents);
}

/** « 120 €/h » ou « 120,50 €/h ». */
export function formatHourlyRate(cents: number): string {
    const euros = cents / 100;
    const text = new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    }).format(euros).replace(/[  ]/g, " ");
    return `${text} €/h`;
}

/**
 * Convertit une saisie en euros (« 150 », « 150,5 », « 1 200,00 ») en
 * centimes. null si la saisie n'est pas un montant valide à 2 décimales max.
 */
export function parseEurosToCents(input: string): number | null {
    const normalized = input.trim().replace(/[\s  ]/g, "").replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
    const [whole, decimals = ""] = normalized.split(".");
    return Number(whole) * 100 + Number(decimals.padEnd(2, "0"));
}

/** Centimes -> valeur d'un champ de saisie (« 120,00 »), vide si null. */
export function centsToInput(cents: number | null | undefined): string {
    if (cents == null) return "";
    return (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * Tarif horaire reçu du client : entier de centimes ≥ 0, ou null (« pas de
 * tarif »). undefined => valeur invalide, à refuser.
 */
export function sanitizeRateCents(value: unknown): number | null | undefined {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 10_000_000) return undefined;
    return value;
}

/** 45 -> « 0h45 », 100 -> « 1h40 ». */
export function formatDurationHM(minutes: number): string {
    const safe = Math.max(0, Math.round(minutes));
    return `${Math.floor(safe / 60)}h${String(safe % 60).padStart(2, "0")}`;
}

// Au-delà, un avertissement (non bloquant) invite à vérifier la saisie.
export const UNUSUAL_AMOUNT_CENTS = 500_000;
export const QUICK_AMOUNTS_CENTS = [5_000, 10_000, 15_000, 20_000];

// ─── Libellés ───

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
 * Libellé d'une opération vu par l'utilisateur. Un ajustement sans auteur est
 * une correction automatique d'un vol signé modifié.
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

/** Message de blocage d'inscription, avec le contact du club s'il existe. */
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
