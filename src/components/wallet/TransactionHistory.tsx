"use client";

import React, { useMemo, useState } from "react";
import { WalletTransactionType } from "@prisma/client";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCents, formatDurationHM, formatHourlyRate, formatSignedCents, PAYMENT_METHOD_LABELS } from "@/lib/wallet";
import type { WalletTransactionView } from "@/api/db/wallet";
import TransactionTypeBadge from "./TransactionTypeBadge";

type Filter = "all" | "payments" | "flights" | "adjustments";

const FILTER_LABELS: Record<Filter, string> = {
    all: "Tout",
    payments: "Paiements",
    flights: "Vols",
    adjustments: "Ajustements",
};

function matches(t: WalletTransactionView, filter: Filter): boolean {
    switch (filter) {
        case "all": return true;
        case "payments": return t.type === WalletTransactionType.CREDIT;
        case "flights": return t.type === WalletTransactionType.DEBIT;
        case "adjustments": return t.type === WalletTransactionType.ADJUSTMENT;
    }
}

const shortDate = (d: Date) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const dayMonth = (d: Date) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

/** Détail lisible d'une opération (vol figé, moyen de paiement, commentaire). */
function detail(t: WalletTransactionView): { main: string; sub: string | null } {
    if (t.flightLogID && t.planeName) {
        const flight = [
            t.flightDate && t.type !== WalletTransactionType.DEBIT ? `Vol du ${dayMonth(t.flightDate)}` : null,
            `${t.planeName}${t.planeRegistration ? ` ${t.planeRegistration}` : ""}`,
            t.durationMin != null ? formatDurationHM(t.durationMin) : null,
            t.rateCents != null ? `${formatHourlyRate(t.rateCents)}${t.rateSource === "INSTRUCTOR" ? " (tarif instructeur)" : ""}` : null,
        ].filter(Boolean).join(" · ");
        return { main: t.comment ?? flight, sub: t.comment ? flight : null };
    }
    const pm = t.paymentMethod ? PAYMENT_METHOD_LABELS[t.paymentMethod] : null;
    const comment = t.comment ? `« ${t.comment} »` : null;
    return { main: [pm, comment].filter(Boolean).join(" · ") || "—", sub: null };
}

const amountClass = (cents: number) => (cents > 0 ? "text-emerald-600" : cents < 0 ? "text-red-600" : "text-slate-500");

interface Props {
    transactions: WalletTransactionView[];
    showAuthor: boolean;
    hasMore: boolean;
    loadingMore: boolean;
    onLoadMore: () => void;
    emptyText: string;
}

const TransactionHistory = ({ transactions, showAuthor, hasMore, loadingMore, onLoadMore, emptyText }: Props) => {
    const [filter, setFilter] = useState<Filter>("all");
    const list = useMemo(() => transactions.filter((t) => matches(t, filter)), [transactions, filter]);

    // Cartes mobiles groupées par mois (« Septembre 2026 »).
    const byMonth = useMemo(() => {
        const groups: { label: string; items: WalletTransactionView[] }[] = [];
        for (const t of list) {
            const label = new Date(t.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
            const last = groups[groups.length - 1];
            if (last && last.label === label) last.items.push(t);
            else groups.push({ label, items: [t] });
        }
        return groups;
    }, [list]);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-800">Historique</h2>
                <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
                    {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => setFilter(f)}
                            className={cn(
                                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                                filter === f ? "bg-purple-50 text-[#774BBE]" : "text-slate-500 hover:bg-slate-50"
                            )}
                        >
                            {FILTER_LABELS[f]}
                        </button>
                    ))}
                </div>
            </div>

            {list.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                    {filter === "all" ? emptyText : "Aucune opération de ce type."}
                </div>
            ) : (
                <>
                    {/* Ordinateur : tableau */}
                    <div className="hidden lg:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100 border-b-2 border-slate-200">
                                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                                    <th className="px-3 py-2.5">Date</th>
                                    <th className="px-3 py-2.5">Opération</th>
                                    <th className="px-3 py-2.5">Détail</th>
                                    {showAuthor && <th className="px-3 py-2.5">Auteur</th>}
                                    <th className="px-3 py-2.5 text-right">Montant</th>
                                    <th className="px-3 py-2.5 text-right">Solde après</th>
                                </tr>
                            </thead>
                            <tbody>
                                {list.map((t) => {
                                    const d = detail(t);
                                    return (
                                        <tr key={t.id} className="border-b border-slate-100 last:border-0 align-top">
                                            <td className="px-3 py-2.5 font-mono tabular-nums text-slate-600 whitespace-nowrap">{shortDate(t.createdAt)}</td>
                                            <td className="px-3 py-2.5"><TransactionTypeBadge type={t.type} authorID={t.authorID} /></td>
                                            <td className="px-3 py-2.5 text-slate-700">
                                                {d.main}
                                                {d.sub && <span className="block text-xs text-slate-400">{d.sub}</span>}
                                            </td>
                                            {showAuthor && (
                                                <td className="px-3 py-2.5 whitespace-nowrap">
                                                    {t.authorName ?? <span className="italic text-slate-400">Automatique</span>}
                                                </td>
                                            )}
                                            <td className={cn("px-3 py-2.5 text-right font-mono tabular-nums font-semibold whitespace-nowrap", amountClass(t.amountCents))}>
                                                {formatSignedCents(t.amountCents)}
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                                                {formatCents(t.balanceAfterCents)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile : cartes groupées par mois */}
                    <div className="lg:hidden space-y-3">
                        {byMonth.map((g) => (
                            <div key={g.label} className="space-y-2">
                                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                    {g.label}<span className="h-px flex-1 bg-slate-200" />
                                </div>
                                {g.items.map((t) => {
                                    const d = detail(t);
                                    return (
                                        <div
                                            key={t.id}
                                            className={cn(
                                                "rounded-xl border border-slate-200 border-l-4 bg-white p-3 text-sm space-y-1",
                                                t.type === WalletTransactionType.CREDIT ? "border-l-emerald-500"
                                                    : t.type === WalletTransactionType.DEBIT ? "border-l-red-500" : "border-l-amber-500"
                                            )}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs text-slate-500">{dayMonth(t.createdAt)}</span>
                                                <span className={cn("font-mono tabular-nums font-bold", amountClass(t.amountCents))}>
                                                    {formatSignedCents(t.amountCents)}
                                                </span>
                                            </div>
                                            <TransactionTypeBadge type={t.type} authorID={t.authorID} />
                                            <p className="text-slate-700">{d.main}</p>
                                            {d.sub && <p className="text-xs text-slate-400">{d.sub}</p>}
                                            <p className="text-xs text-slate-400">
                                                Solde après : <span className="font-mono tabular-nums">{formatCents(t.balanceAfterCents)}</span>
                                                {showAuthor && <> · {t.authorName ? `par ${t.authorName}` : "automatique"}</>}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {hasMore && (
                <div className="flex justify-center">
                    <button
                        type="button"
                        onClick={onLoadMore}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                        <ChevronDown className="h-4 w-4" />
                        {loadingMore ? "Chargement…" : "Voir plus"}
                    </button>
                </div>
            )}
        </div>
    );
};

export default TransactionHistory;
