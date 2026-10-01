"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CircleMinus, CirclePlus, Eye, HelpCircle, Wallet } from "lucide-react";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { getMemberWallet, WalletTransactionView } from "@/api/db/wallet";
import { Button } from "@/components/ui/button";
import FlightLoader from "@/components/loader/FlightLoader";
import { cn } from "@/lib/utils";
import { BALANCE_STATE_LABELS, BalanceState, formatCents, formatDurationHM, formatSignedCents, isOverdrawn } from "@/lib/wallet";
import { WALLET_EVENT } from "@/lib/walletEvents";
import { balanceStateStyle } from "./BalancePill";
import ClubPaymentContact from "./ClubPaymentContact";
import TransactionHistory from "./TransactionHistory";
import WalletOperationDialog, { OperationKind } from "./WalletOperationDialog";
import { ROLE_LABELS } from "./roleLabels";

// Label seen by management: debt first, then whether bookings are blocked.
function memberStateLabel(state: BalanceState, balanceCents: number): string {
    if (isOverdrawn(balanceCents)) return state === "blocked" ? "À découvert : inscriptions bloquées" : "À découvert";
    if (state === "blocked") return "Solde insuffisant : inscriptions bloquées";
    return state === "low" ? "Solde faible" : "Solde suffisant";
}

type WalletData = Extract<Awaited<ReturnType<typeof getMemberWallet>>, { success: true }>;

interface Props {
    /** null => own wallet. */
    userID: string | null;
    /** Opens the credit dialog directly (shortcut from the Users page). */
    openCredit?: boolean;
}

/**
 * Wallet details: "My wallet" for students / pilots, or a member's card for
 * management (with author and actions) and instructors (read-only).
 */
const MemberWalletDetail = ({ userID, openCredit = false }: Props) => {
    const { currentClub } = useCurrentClub();
    const [data, setData] = useState<WalletData | null>(null);
    const [transactions, setTransactions] = useState<WalletTransactionView[]>([]);
    const [page, setPage] = useState(0);
    const [error, setError] = useState("");
    const [loadingMore, setLoadingMore] = useState(false);
    const [dialog, setDialog] = useState<OperationKind | null>(null);
    const [showContact, setShowContact] = useState(false);
    const [creditOpened, setCreditOpened] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await getMemberWallet(userID, 0);
            if (!res.success) {
                setError(res.error ?? "Erreur lors du chargement du portefeuille.");
                return;
            }
            setData(res);
            if (openCredit && res.canOperate && !creditOpened) {
                setCreditOpened(true);
                setDialog("CREDIT");
            }
            setTransactions(res.transactions);
            setPage(0);
            setError("");
        } catch {
            setError("Erreur lors du chargement du portefeuille.");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userID]);

    useEffect(() => {
        load();
        window.addEventListener(WALLET_EVENT, load);
        return () => window.removeEventListener(WALLET_EVENT, load);
    }, [load]);

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const res = await getMemberWallet(userID, page + 1);
            if (res.success) {
                setTransactions((prev) => [...prev, ...res.transactions]);
                setPage(page + 1);
                setData((prev) => (prev ? { ...prev, hasMore: res.hasMore } : prev));
            }
        } finally {
            setLoadingMore(false);
        }
    };

    if (error) {
        return <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
    }
    if (!data) {
        // Negative margins cancel WalletPageComponent's padding: the landing overlay only
        // covers the loader's box, so the padding strip would reveal the content underneath.
        return <FlightLoader variant="page" className="-m-4 w-auto flex-1 md:-m-8" />;
    }

    const { member, isSelf, canOperate, state, balanceCents, month, year } = data;
    const style = balanceStateStyle(state, balanceCents);
    const readOnlyViewer = !isSelf && !canOperate;
    const contactOpen = showContact || state !== "ok";
    const monthLabel = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

    return (
        <div className="space-y-6">
            {/* Header */}
            {isSelf ? (
                <div>
                    <h1 className="font-bold text-2xl md:text-3xl text-slate-900 tracking-tight">Mon portefeuille</h1>
                    <p className="text-slate-500 text-sm">Suivez votre solde et vos paiements au club.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <Link href={`/wallet?clubID=${currentClub?.id ?? ""}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#774BBE]">
                        <ArrowLeft className="h-4 w-4" /> Tous les portefeuilles
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-purple-400 to-[#774BBE] text-white font-bold grid place-items-center">
                                {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="font-bold text-xl text-slate-900">{member.firstName} {member.lastName.toUpperCase()}</h1>
                                    <span className="rounded-full border border-purple-100 bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-[#774BBE]">
                                        {ROLE_LABELS[member.role]}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500">{[member.email, member.phone].filter(Boolean).join(" · ")}</p>
                            </div>
                        </div>
                        {canOperate && (
                            <div className="hidden md:flex items-center gap-2">
                                <Button onClick={() => setDialog("CREDIT")} className="bg-[#774BBE] hover:bg-[#6538a5] text-white gap-1.5">
                                    <CirclePlus className="h-4 w-4" /> Créditer
                                </Button>
                                <Button variant="outline" onClick={() => setDialog("WITHDRAW")} className="gap-1.5 border-slate-200">
                                    <CircleMinus className="h-4 w-4" /> Retrait / correction
                                </Button>
                            </div>
                        )}
                    </div>
                    {readOnlyViewer && (
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            <Eye className="h-4 w-4" /> Consultation seule : seuls le président et les managers peuvent enregistrer des paiements.
                        </div>
                    )}
                </div>
            )}

            {/* Balance + summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                    <div className="flex items-center gap-2">
                        <span className={cn("p-1.5 rounded-lg border", style.pill)}><style.Icon className="h-4 w-4" /></span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Solde actuel</span>
                    </div>
                    <p className={cn("text-4xl font-bold font-mono tabular-nums tracking-tight", style.text)}>{formatCents(balanceCents)}</p>
                    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold", style.pill)}>
                        {isSelf ? BALANCE_STATE_LABELS[state] : memberStateLabel(state, balanceCents)}
                    </span>
                    {transactions[0] && (
                        <p className="text-xs text-slate-400">
                            Dernière opération : {new Date(transactions[0].createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                        </p>
                    )}
                </div>

                {isSelf ? (
                    <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        {contactOpen ? (
                            <div className="space-y-2">
                                <h2 className="font-semibold text-slate-800">Recharger mon compte</h2>
                                <ClubPaymentContact contact={data.contact} />
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowContact(true)}
                                className="flex w-full items-center gap-2 text-left text-sm font-medium text-slate-600 hover:text-[#774BBE]"
                            >
                                <HelpCircle className="h-4 w-4" /> Comment recharger mon compte ?
                            </button>
                        )}
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <PeriodCard title={monthLabel} summary={month} />
                            <PeriodCard title={`Année ${new Date().getFullYear()}`} summary={year} />
                        </div>
                    </div>
                ) : (
                    <>
                        <PeriodCard title={monthLabel} summary={month} large />
                        <PeriodCard title={`Année ${new Date().getFullYear()}`} summary={year} large />
                    </>
                )}
            </div>

            <TransactionHistory
                transactions={transactions}
                showAuthor={!isSelf}
                hasMore={data.hasMore}
                loadingMore={loadingMore}
                onLoadMore={loadMore}
                emptyText={isSelf
                    ? "Aucune opération pour le moment. Vos paiements au club et vos vols d'instruction signés apparaîtront ici."
                    : "Aucune opération pour ce membre."}
            />

            {/* Mobile: actions in a fixed bar (left of the floating menu button) */}
            {canOperate && !isSelf && (
                <div className="md:hidden sticky bottom-0 -mx-4 bg-white/95 backdrop-blur border-t border-slate-200 p-3 pr-24 grid grid-cols-2 gap-2">
                    <Button onClick={() => setDialog("CREDIT")} className="bg-[#774BBE] hover:bg-[#6538a5] text-white gap-1">
                        <CirclePlus className="h-4 w-4" /> Créditer
                    </Button>
                    <Button variant="outline" onClick={() => setDialog("WITHDRAW")} className="gap-1 border-slate-200">
                        <CircleMinus className="h-4 w-4" /> Retirer
                    </Button>
                </div>
            )}

            {canOperate && (
                <WalletOperationDialog
                    open={dialog != null}
                    onOpenChange={(o) => { if (!o) setDialog(null); }}
                    members={[{ id: member.id, firstName: member.firstName, lastName: member.lastName, balanceCents }]}
                    memberID={member.id}
                    initialKind={dialog ?? "CREDIT"}
                />
            )}
        </div>
    );
};

interface PeriodSummary {
    paidCents: number;
    paymentCount: number;
    flightsCents: number;
    flightCount: number;
    flightMinutes: number;
}

/** Period summary: what was paid to the club / what the flights cost. */
const PeriodCard = ({ title, summary, large }: { title: string; summary: PeriodSummary; large?: boolean }) => (
    <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2", large ? "p-5" : "p-4")}>
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Wallet className="h-3.5 w-3.5" /> {title}
        </p>
        <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-slate-500">
                Payé au club <span className="text-slate-400">· {summary.paymentCount} paiement{summary.paymentCount > 1 ? "s" : ""}</span>
            </span>
            <span className="font-mono tabular-nums font-semibold text-emerald-600">{formatSignedCents(summary.paidCents)}</span>
        </div>
        <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-slate-500">
                Vols débités{" "}
                <span className="text-slate-400">
                    · {summary.flightCount} vol{summary.flightCount > 1 ? "s" : ""}
                    {summary.flightMinutes > 0 && <> · {formatDurationHM(summary.flightMinutes)}</>}
                </span>
            </span>
            <span className="font-mono tabular-nums font-semibold text-red-600">{formatSignedCents(summary.flightsCents)}</span>
        </div>
    </div>
);

export default MemberWalletDetail;
