import {
    flight_logs,
    PaymentMethod,
    Prisma,
    WalletRateSource,
    WalletTransactionType,
} from "@prisma/client";
import { Resend } from "resend";
import prisma from "@/api/prisma";
import WalletLowBalance from "@/emails/WalletLowBalance";
import { appUrl } from "@/lib/appUrl";
import { computeDurationMinutes } from "@/lib/logbookCalc";
import {
    balanceState,
    computeFlightAdjustmentCents,
    computeLowThresholdCents,
    crossedLowThreshold,
    formatCents,
    formatDurationHM,
    isBillableFlight,
    planFlightCharge,
    resolvePayerID,
} from "@/lib/wallet";

/**
 * Écritures du portefeuille (AER-66) — SERVEUR UNIQUEMENT.
 *
 * Volontairement SANS "use server" : ces fonctions ne font aucun contrôle
 * d'accès (c'est le rôle des server actions appelantes) et ne doivent donc
 * jamais être exposées au navigateur comme server actions (ne les importer
 * que depuis des modules serveur : src/api/db/*).
 *
 * Invariant : le solde (`Wallet.balanceCents`) et l'historique
 * (`WalletTransaction`) évoluent TOUJOURS ensemble, dans la même transaction
 * Prisma. L'historique n'est jamais modifié ni supprimé.
 */

type Tx = Prisma.TransactionClient;

/** Refus métier levé dans une transaction pour l'annuler (tarif manquant…). */
export class WalletChargeError extends Error {}

export interface WalletMovementInput {
    clubID: string;
    userID: string;
    amountCents: number; // signé
    type: WalletTransactionType;
    paymentMethod?: PaymentMethod | null;
    comment?: string | null;
    authorID?: string | null;
    flight?: {
        flightLogID: string;
        flightDate: Date;
        planeName: string;
        planeRegistration: string;
        durationMin: number;
        rateCents: number;
        rateSource: WalletRateSource;
    };
}

export interface WalletMovementResult {
    clubID: string;
    userID: string;
    beforeCents: number;
    afterCents: number;
    amountCents: number;
}

/**
 * Applique un mouvement : incrément atomique du solde (portefeuille créé à la
 * volée), puis écriture de la ligne d'historique avec le solde après opération.
 */
export async function applyWalletMovement(tx: Tx, input: WalletMovementInput): Promise<WalletMovementResult> {
    const wallet = await tx.wallet.upsert({
        where: { clubID_userID: { clubID: input.clubID, userID: input.userID } },
        create: { clubID: input.clubID, userID: input.userID, balanceCents: input.amountCents },
        update: { balanceCents: { increment: input.amountCents } },
        select: { balanceCents: true },
    });

    await tx.walletTransaction.create({
        data: {
            clubID: input.clubID,
            userID: input.userID,
            type: input.type,
            amountCents: input.amountCents,
            balanceAfterCents: wallet.balanceCents,
            paymentMethod: input.paymentMethod ?? null,
            comment: input.comment ?? null,
            authorID: input.authorID ?? null,
            ...(input.flight && {
                flightLogID: input.flight.flightLogID,
                flightDate: input.flight.flightDate,
                planeName: input.flight.planeName,
                planeRegistration: input.flight.planeRegistration,
                durationMin: input.flight.durationMin,
                rateCents: input.flight.rateCents,
                rateSource: input.flight.rateSource,
            }),
        },
    });

    return {
        clubID: input.clubID,
        userID: input.userID,
        beforeCents: wallet.balanceCents - input.amountCents,
        afterCents: wallet.balanceCents,
        amountCents: input.amountCents,
    };
}

type ChargeableLog = Pick<
    flight_logs,
    | "id" | "clubID" | "date" | "planeID" | "planeName" | "planeRegistration"
    | "pilotID" | "instructorID" | "studentID"
    | "flightNature" | "instructionSubType" | "hobbsStart" | "hobbsEnd"
>;

/**
 * Débit d'un vol à sa signature. Ne fait rien si le portefeuille du club est
 * désactivé, si le vol n'est pas facturable (baptême, CDB) ou sans payeur
 * identifiable. Lève WalletChargeError (qui annule la signature) si le tarif
 * manque ou si payeur / machine n'appartiennent pas au club du vol.
 */
export async function chargeSignedFlight(tx: Tx, log: ChargeableLog): Promise<WalletMovementResult | null> {
    const club = await tx.club.findUnique({
        where: { id: log.clubID },
        select: { walletEnabled: true, instructorHourlyRateCents: true },
    });

    // Payeur et machine ne sont relus que si un débit est possible.
    const payerID = club?.walletEnabled && isBillableFlight(log) ? resolvePayerID(log) : null;
    const [payer, plane] = payerID
        ? await Promise.all([
            tx.user.findUnique({ where: { id: payerID }, select: { clubID: true } }),
            log.planeID ? tx.planes.findUnique({ where: { id: log.planeID } }) : null,
        ])
        : [null, null];

    // Décision pure et testée (cf. planFlightCharge dans src/lib/wallet.ts).
    const plan = planFlightCharge({
        walletEnabled: !!club?.walletEnabled,
        log,
        payer: payer ? { clubID: payer.clubID } : null,
        plane,
        club: { instructorHourlyRateCents: club?.instructorHourlyRateCents ?? null },
    });
    if (plan.action === "skip") return null;
    if (plan.action === "reject") throw new WalletChargeError(plan.message);

    return applyWalletMovement(tx, {
        clubID: log.clubID,
        userID: plan.payerID,
        amountCents: -plan.amountCents,
        type: WalletTransactionType.DEBIT,
        flight: {
            flightLogID: log.id,
            flightDate: log.date,
            planeName: plane?.name ?? log.planeName,
            planeRegistration: plane?.immatriculation ?? log.planeRegistration,
            durationMin: plan.durationMin,
            rateCents: plan.rateCents,
            rateSource: plan.rateSource,
        },
    });
}

/**
 * Après correction d'un vol DÉJÀ signé (OWNER/ADMIN) : recalcule ce qu'il
 * aurait dû coûter au TARIF FIGÉ lors du débit d'origine, et passe un
 * ajustement automatique de la différence. Un vol signé avant l'activation du
 * portefeuille (aucun débit) n'est jamais régularisé.
 */
export async function reconcileSignedFlight(tx: Tx, log: ChargeableLog): Promise<WalletMovementResult | null> {
    const movements = await tx.walletTransaction.findMany({
        where: { flightLogID: log.id, clubID: log.clubID },
        orderBy: { createdAt: "asc" },
    });
    const debit = movements.find((m) => m.type === WalletTransactionType.DEBIT);
    if (!debit || debit.rateCents == null || debit.rateSource == null) return null;

    const durationMin = computeDurationMinutes(log.hobbsStart, log.hobbsEnd);
    const diff = computeFlightAdjustmentCents({
        billable: isBillableFlight(log),
        durationMin,
        frozenRateCents: debit.rateCents,
        movementsSumCents: movements.reduce((sum, m) => sum + m.amountCents, 0),
    });
    if (diff === 0) return null;

    const previousDuration = movements[movements.length - 1].durationMin ?? debit.durationMin ?? 0;
    const day = log.date.toISOString().slice(0, 10).split("-").reverse().slice(0, 2).join("/");
    const comment = isBillableFlight(log)
        ? `Vol du ${day} modifié : ${formatDurationHM(previousDuration)} → ${formatDurationHM(durationMin)}`
        : `Vol du ${day} requalifié : plus facturé`;

    return applyWalletMovement(tx, {
        clubID: log.clubID,
        userID: debit.userID,
        amountCents: diff,
        type: WalletTransactionType.ADJUSTMENT,
        comment,
        flight: {
            flightLogID: log.id,
            flightDate: log.date,
            planeName: debit.planeName ?? log.planeName,
            planeRegistration: debit.planeRegistration ?? log.planeRegistration,
            durationMin,
            rateCents: debit.rateCents,
            rateSource: debit.rateSource,
        },
    });
}

/** Seuil « solde faible » du club (heure de vol sur la machine d'école la moins chère). */
export async function getClubLowThresholdCents(clubID: string): Promise<number | null> {
    const list = await prisma.planes.findMany({
        where: { clubID },
        select: { ownerID: true, usageTypes: true, instructionHourlyRateCents: true },
    });
    return computeLowThresholdCents(list);
}

let resendClient: Resend | null = null;
function getResend(): Resend | null {
    if (!process.env.RESEND_API_KEY || !process.env.SENDER_EMAIL) return null;
    resendClient ??= new Resend(process.env.RESEND_API_KEY);
    return resendClient;
}

/**
 * E-mail « solde faible », envoyé uniquement au passage sous le seuil (épuisé
 * inclus). À appeler APRÈS la transaction : un échec d'envoi ne doit jamais
 * annuler une opération sur le portefeuille.
 */
export async function notifyLowBalanceIfCrossed(movement: WalletMovementResult | null): Promise<void> {
    if (!movement) return;
    try {
        const threshold = await getClubLowThresholdCents(movement.clubID);
        if (!crossedLowThreshold(movement.beforeCents, movement.afterCents, threshold)) return;

        const [user, club] = await Promise.all([
            prisma.user.findUnique({ where: { id: movement.userID }, select: { email: true, firstName: true, clubID: true } }),
            prisma.club.findUnique({ where: { id: movement.clubID } }),
        ]);
        if (!user?.email || !club || user.clubID !== club.id) return;

        const resend = getResend();
        if (!resend) return;
        const contactName = [club.firstNameContact, club.lastNameContact?.toUpperCase()].filter(Boolean).join(" ") || null;

        await resend.emails.send({
            from: process.env.SENDER_EMAIL as string,
            to: user.email,
            subject: balanceState(movement.afterCents, threshold) === "empty" ? "Votre solde est épuisé" : "Votre solde est faible",
            react: WalletLowBalance({
                firstName: user.firstName,
                balance: formatCents(movement.afterCents),
                isEmpty: balanceState(movement.afterCents, threshold) === "empty",
                contactName,
                phoneContact: club.phoneContact,
                mailContact: club.mailContact,
                walletLink: `${appUrl()}/wallet?clubID=${club.id}`,
                clubName: club.Name,
                clubAdress: { countrie: club.Country, zipCode: club.ZipCode, city: club.City, adress: club.Address },
            }),
        });
    } catch {
        // silencieux : l'e-mail est non critique
    }
}

