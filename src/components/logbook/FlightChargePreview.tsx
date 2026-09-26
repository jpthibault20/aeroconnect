"use client";

import React, { useEffect, useState } from "react";
import { flightNature, instructionSubType, WalletTransaction } from "@prisma/client";
import { Ban, Wallet } from "lucide-react";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { getFlightChargeQuote, getFlightLogCharges } from "@/api/db/wallet";
import {
    computeFlightChargeCents,
    formatCents,
    formatDurationHM,
    formatHourlyRate,
    formatSignedCents,
    isBillableFlight,
    resolvePayerID,
} from "@/lib/wallet";

interface FlightInfo {
    flightNature: flightNature | null;
    instructionSubType: instructionSubType | null;
    pilotID: string;
    instructorID: string | null;
    studentID: string | null;
    planeID: string | null;
}

type Quote = Extract<Awaited<ReturnType<typeof getFlightChargeQuote>>, { success: true }>;

interface PreviewProps {
    flight: FlightInfo;
    /** Duration computed from the entered Hobbs; null while incomplete. */
    minutes: number | null;
    /** Reports the "signing blocked" state (missing rate) to the parent. */
    onBlockedChange?: (blocked: boolean) => void;
}

/**
 * "Debit on signing" block (AER-66), in the logbook dialogs' footer next to the
 * "Save and sign" button: the instructor (or pilot) sees what they trigger before
 * signing. Same computation as the server debit. Nothing shown if the wallet is
 * disabled or the flight is not billable (discovery flight, CDB).
 */
export const FlightChargePreview = ({ flight, minutes, onBlockedChange }: PreviewProps) => {
    const { currentClub } = useCurrentClub();
    const payerID = resolvePayerID(flight);
    const billable = !!currentClub?.walletEnabled && !!flight.flightNature && !!payerID && !!flight.planeID
        && isBillableFlight({ flightNature: flight.flightNature, instructionSubType: flight.instructionSubType });

    // Quote tied to its key (plane + payer): a quote obtained for another selection
    // is never shown.
    const quoteKey = billable ? `${flight.planeID}:${payerID}` : null;
    const [fetched, setFetched] = useState<{ key: string; quote: Quote | null } | null>(null);

    useEffect(() => {
        if (!quoteKey || !flight.planeID || !payerID) return;
        let cancelled = false;
        getFlightChargeQuote(flight.planeID, payerID)
            .then((res) => { if (!cancelled) setFetched({ key: quoteKey, quote: res.success ? res : null }); })
            .catch(() => { if (!cancelled) setFetched({ key: quoteKey, quote: null }); });
        return () => { cancelled = true; };
    }, [quoteKey, flight.planeID, payerID]);

    const quote = fetched && fetched.key === quoteKey ? fetched.quote : null;
    const blocked = billable && !!quote && !quote.rate.ok;
    useEffect(() => { onBlockedChange?.(blocked); }, [blocked, onBlockedChange]);

    if (!billable || !quote) return null;

    if (!quote.rate.ok) {
        return (
            <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <Ban className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="font-semibold">Signature impossible</p>
                    <p>{quote.rate.message}</p>
                </div>
            </div>
        );
    }

    const { rateCents, source } = quote.rate;
    const rateLabel = source === "INSTRUCTOR"
        ? `${formatHourlyRate(rateCents)} (tarif instructeur, machine privée)`
        : `${formatHourlyRate(rateCents)} (${quote.planeLabel})`;

    if (minutes == null || minutes <= 0) {
        return (
            <div className="flex gap-2 rounded-lg border border-purple-100 bg-purple-50 p-3 text-sm text-slate-600">
                <Wallet className="h-4 w-4 flex-shrink-0 mt-0.5 text-[#774BBE]" />
                <p>Montant calculé dès la saisie des heures moteur de fin ({rateLabel}).</p>
            </div>
        );
    }

    const amount = computeFlightChargeCents(minutes, rateCents);
    const after = quote.balanceCents != null ? quote.balanceCents - amount : null;

    return (
        <div className="rounded-lg border border-purple-100 bg-purple-50 p-3 text-sm space-y-1">
            <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-semibold text-[#774BBE]">
                    <Wallet className="h-4 w-4" />
                    {quote.isSelf ? "Votre compte sera débité de" : "Débit à la signature"}
                </span>
                <span className="font-mono tabular-nums font-bold text-slate-900">{formatCents(amount)}</span>
            </div>
            <p className="text-slate-600">
                {quote.isSelf ? "" : `Compte de ${quote.payerName} · `}
                {formatDurationHM(minutes)} × {rateLabel}
            </p>
            {after != null && (
                <p className={after <= 0 ? "text-amber-700" : "text-slate-500"}>
                    Solde après signature : <span className="font-mono tabular-nums">{formatCents(after)}</span>
                    {after <= 0 && (quote.isSelf
                        ? ". Vous ne pourrez plus vous inscrire tant que votre solde n'est pas rechargé."
                        : `. ${quote.payerName} ne pourra plus s'inscrire tant que son solde n'est pas rechargé.`)}
                </p>
            )}
        </div>
    );
};

/** Amount debited on a signed flight (debit + any corrections). */
export const FlightChargeSummary = ({ logID }: { logID: string }) => {
    const { currentClub } = useCurrentClub();
    const [data, setData] = useState<{ movements: WalletTransaction[]; payerName: string | null } | null>(null);

    useEffect(() => {
        if (!currentClub?.walletEnabled) return;
        let cancelled = false;
        getFlightLogCharges(logID)
            .then((res) => { if (!cancelled && res.success) setData({ movements: res.movements, payerName: res.payerName }); })
            .catch(() => { });
        return () => { cancelled = true; };
    }, [logID, currentClub?.walletEnabled]);

    const debit = data?.movements.find((m) => m.type === "DEBIT");
    if (!data || !debit) return null;
    const corrections = data.movements.filter((m) => m.id !== debit.id);

    return (
        <div className="flex items-start gap-1.5 text-xs text-slate-600">
            <Wallet className="w-3.5 h-3.5 mt-0.5 text-[#774BBE] flex-shrink-0" />
            <span>
                Débité : <span className="font-mono tabular-nums font-semibold">{formatCents(-debit.amountCents)}</span>
                {data.payerName && <> sur le compte de {data.payerName}</>}
                {debit.durationMin != null && debit.rateCents != null && (
                    <> ({formatDurationHM(debit.durationMin)} × {formatHourlyRate(debit.rateCents)})</>
                )}
                {corrections.map((c) => (
                    <span key={c.id} className="block">
                        + correction {formatSignedCents(c.amountCents)} le{" "}
                        {new Date(c.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                    </span>
                ))}
            </span>
        </div>
    );
};
