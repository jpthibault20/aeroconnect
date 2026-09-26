"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { userRole } from "@prisma/client";
import { Ban, CirclePlus, Eye, History, Info, Search, TrendingUp, Wallet } from "lucide-react";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { getClubWallets, WalletMemberRow } from "@/api/db/wallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FlightLoader from "@/components/loader/FlightLoader";
import { cn } from "@/lib/utils";
import { formatCents, formatSignedCents, isOverdrawn, transactionLabel } from "@/lib/wallet";
import { WALLET_EVENT } from "@/lib/walletEvents";
import BalancePill from "./BalancePill";
import WalletOperationDialog from "./WalletOperationDialog";
import { ROLE_LABELS } from "./roleLabels";

type WalletsData = Extract<Awaited<ReturnType<typeof getClubWallets>>, { success: true }>;
type Filter = "all" | "overdrawn" | "blocked" | "low" | "ok" | "students" | "pilots";

const FILTER_LABELS: Record<Filter, string> = {
    all: "Tous les membres",
    overdrawn: "À découvert (solde négatif)",
    blocked: "Inscription bloquée (solde ≤ 0)",
    low: "Solde faible",
    ok: "Solde positif",
    students: "Élèves",
    pilots: "Pilotes",
};

function applyFilter(rows: WalletMemberRow[], filter: Filter, query: string): WalletMemberRow[] {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
        if (q && !`${r.firstName} ${r.lastName}`.toLowerCase().includes(q)) return false;
        switch (filter) {
            case "all": return true;
            case "overdrawn": return isOverdrawn(r.balanceCents);
            case "blocked": return r.state === "empty";
            case "low": return r.state === "low";
            case "ok": return r.state === "ok";
            case "students": return r.role === userRole.STUDENT;
            case "pilots": return r.role === userRole.PILOT;
        }
    });
}

const lastOpLabel = (r: WalletMemberRow) => r.lastOperation
    ? `${new Date(r.lastOperation.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} · ${transactionLabel(r.lastOperation.type, r.lastOperation.authorID)}`
    : "—";

/**
 * "Wallets": balances of every club member, sorted from most indebted to most in
 * credit. Management: credit / withdrawal and financial totals. Instructor:
 * read-only, without totals.
 */
const WalletMembersPage = () => {
    const { currentClub } = useCurrentClub();
    const [data, setData] = useState<WalletsData | null>(null);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const [dialog, setDialog] = useState<{ memberID: string | null } | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await getClubWallets();
                if (cancelled) return;
                if (!res.success) {
                    setError(res.error ?? "Erreur lors du chargement des portefeuilles.");
                    return;
                }
                setData(res);
                setError("");
            } catch {
                if (!cancelled) setError("Erreur lors du chargement des portefeuilles.");
            }
        };
        load();
        window.addEventListener(WALLET_EVENT, load);
        return () => {
            cancelled = true;
            window.removeEventListener(WALLET_EVENT, load);
        };
    }, []);

    const rows = useMemo(() => (data ? applyFilter(data.rows, filter, query) : []), [data, filter, query]);

    if (error) return <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
    if (!data) return <FlightLoader variant="inline" className="py-12" />;

    const { canOperate, totals } = data;
    const detailHref = (id: string) => `/wallet?clubID=${currentClub?.id ?? ""}&userID=${id}`;
    const members = data.rows.map((r) => ({ id: r.id, firstName: r.firstName, lastName: r.lastName, balanceCents: r.balanceCents }));

    return (
        <div className="space-y-5">
            {/* Top bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-[#774BBE] rounded-lg hidden sm:block"><Wallet className="w-6 h-6" /></div>
                    <h1 className="font-bold text-2xl md:text-3xl text-slate-900 tracking-tight">Portefeuilles</h1>
                    <span className="px-3 py-1 bg-white text-[#774BBE] border border-purple-100 font-semibold rounded-full text-sm shadow-sm">
                        {data.rows.length}
                    </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Rechercher un membre"
                            className="pl-9 bg-white border-slate-200 sm:w-56"
                        />
                    </div>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as Filter)}
                        className={cn(
                            "h-10 rounded-md border bg-white px-3 text-sm",
                            filter === "all" ? "border-slate-200 text-slate-700" : "border-[#774BBE] text-[#774BBE] font-medium"
                        )}
                        aria-label="Filtrer les membres"
                    >
                        {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => <option key={f} value={f}>{FILTER_LABELS[f]}</option>)}
                    </select>
                    {canOperate && (
                        <Button onClick={() => setDialog({ memberID: null })} className="bg-[#774BBE] hover:bg-[#6538a5] text-white gap-1.5">
                            <CirclePlus className="h-4 w-4" /> Enregistrer un paiement
                        </Button>
                    )}
                </div>
            </div>

            {!canOperate && (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    <Eye className="h-4 w-4 flex-shrink-0" /> Consultation seule : seuls le président et les managers peuvent enregistrer des paiements.
                </div>
            )}

            {canOperate && !data.hasAnyTransaction && (
                <div className="flex items-start gap-2 rounded-lg border border-purple-100 bg-purple-50 px-3 py-2 text-sm text-slate-700">
                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-[#774BBE]" />
                    Commencez par enregistrer les paiements déjà reçus : tous les soldes démarrent à 0 €, et les élèves à 0 € ne peuvent pas s&apos;inscrire.
                </div>
            )}

            {/* Indicators (management only) */}
            {totals && (
                <>
                    <div className="hidden md:grid grid-cols-3 gap-4">
                        <KpiCard icon={Ban} tone="red" label="À découvert" value={`${totals.overdraftCount} membre${totals.overdraftCount > 1 ? "s" : ""}`} sub="solde négatif" />
                        <KpiCard icon={Wallet} tone="amber" label="Total dû au club" value={formatCents(totals.totalDueCents)} mono />
                        <KpiCard icon={TrendingUp} tone="emerald" label="Encaissé ce mois" value={formatSignedCents(totals.cashedThisMonthCents)} mono />
                    </div>
                    <div className="md:hidden rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                        <strong>{totals.overdraftCount} à découvert</strong> · <span className="font-mono tabular-nums">{formatCents(totals.totalDueCents)}</span>
                    </div>
                </>
            )}

            {rows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                    {filter === "overdrawn" ? "Aucun membre à découvert."
                        : filter === "blocked" ? "Aucun membre bloqué : tous les soldes sont positifs."
                            : "Aucun membre trouvé."}
                </div>
            ) : (
                <>
                    {/* Desktop */}
                    <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100 border-b-2 border-slate-200">
                                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                                    <th className="px-4 py-2.5">Identité</th>
                                    <th className="px-4 py-2.5">Rôle</th>
                                    <th className="px-4 py-2.5">Dernière opération</th>
                                    <th className="px-4 py-2.5 text-right">Solde ↑</th>
                                    <th className="px-4 py-2.5" />
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                                        <td className="px-4 py-2.5">
                                            <Link href={detailHref(r.id)} className="flex items-center gap-3 font-semibold text-slate-800 hover:text-[#774BBE]">
                                                <Avatar row={r} />
                                                {r.lastName.toUpperCase()} {r.firstName}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-2.5"><RoleBadge role={r.role} /></td>
                                        <td className="px-4 py-2.5 text-slate-500">{lastOpLabel(r)}</td>
                                        <td className="px-4 py-2.5 text-right"><BalancePill balanceCents={r.balanceCents} state={r.state} showIcon={false} /></td>
                                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                            {canOperate && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setDialog({ memberID: r.id })}
                                                    className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1"
                                                >
                                                    <CirclePlus className="h-3.5 w-3.5" /> Créditer
                                                </Button>
                                            )}
                                            <Link href={detailHref(r.id)} title="Historique" className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-[#774BBE]">
                                                <History className="h-4 w-4" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile */}
                    <div className="md:hidden space-y-3">
                        {rows.map((r) => (
                            <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Avatar row={r} />
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-800 truncate">{r.firstName} {r.lastName.toUpperCase()}</p>
                                            <div className="flex items-center gap-1.5">
                                                <RoleBadge role={r.role} />
                                                <span className="text-[11px] text-slate-400">{lastOpLabel(r)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        "font-mono tabular-nums font-bold text-base whitespace-nowrap",
                                        isOverdrawn(r.balanceCents) ? "text-red-600" : r.state !== "ok" ? "text-amber-600" : "text-emerald-600"
                                    )}>
                                        {formatCents(r.balanceCents)}
                                    </span>
                                </div>
                                <div className={cn("grid gap-2", canOperate ? "grid-cols-2" : "grid-cols-1")}>
                                    {canOperate && (
                                        <Button size="sm" variant="outline" onClick={() => setDialog({ memberID: r.id })} className="border-emerald-200 text-emerald-700 gap-1">
                                            <CirclePlus className="h-3.5 w-3.5" /> Créditer
                                        </Button>
                                    )}
                                    <Link href={detailHref(r.id)} className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600">
                                        <History className="h-3.5 w-3.5" /> Historique
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {canOperate && (
                <WalletOperationDialog
                    open={dialog != null}
                    onOpenChange={(o) => { if (!o) setDialog(null); }}
                    members={members}
                    memberID={dialog?.memberID ?? null}
                    initialKind="CREDIT"
                />
            )}
        </div>
    );
};

const Avatar = ({ row }: { row: WalletMemberRow }) => (
    <span className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-purple-400 to-[#774BBE] text-white text-[11px] font-bold grid place-items-center">
        {row.firstName.charAt(0)}{row.lastName.charAt(0)}
    </span>
);

const RoleBadge = ({ role }: { role: userRole }) => (
    <span className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        role === userRole.STUDENT ? "border-purple-100 bg-purple-50 text-[#774BBE]" : "border-slate-200 bg-slate-50 text-slate-600"
    )}>
        {ROLE_LABELS[role]}
    </span>
);

const KPI_TONES = {
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
};

const KpiCard = ({ icon: Icon, tone, label, value, sub, mono }: {
    icon: React.ElementType; tone: keyof typeof KPI_TONES; label: string; value: string; sub?: string; mono?: boolean;
}) => (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <span className={cn("p-2 rounded-lg", KPI_TONES[tone])}><Icon className="h-5 w-5" /></span>
        <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
            <p className={cn("text-xl font-bold text-slate-900", mono && "font-mono tabular-nums")}>{value}</p>
            {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
    </div>
);

export default WalletMembersPage;
