"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CirclePlus, Wallet } from "lucide-react";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { getClubWallets, WalletMemberRow, WalletTotals } from "@/api/db/wallet";
import { Button } from "@/components/ui/button";
import { formatCents, formatSignedCents, isOverdrawn } from "@/lib/wallet";
import { WALLET_EVENT } from "@/lib/walletEvents";
import WalletOperationDialog from "@/components/wallet/WalletOperationDialog";
import { ROLE_LABELS } from "@/components/wallet/roleLabels";

/**
 * Carte « Portefeuilles » de la page Club (gestion uniquement, portefeuille
 * activé) : chiffres clés et les 5 soldes les plus négatifs, à relancer.
 */
const WalletSummaryCard = () => {
    const { currentClub } = useCurrentClub();
    const [rows, setRows] = useState<WalletMemberRow[]>([]);
    const [totals, setTotals] = useState<WalletTotals | null>(null);
    const [dialogMember, setDialogMember] = useState<string | null>(null);

    useEffect(() => {
        if (!currentClub?.walletEnabled) return;
        const load = async () => {
            try {
                const res = await getClubWallets();
                if (res.success) {
                    setRows(res.rows);
                    setTotals(res.totals);
                }
            } catch {
            }
        };
        load();
        window.addEventListener(WALLET_EVENT, load);
        return () => window.removeEventListener(WALLET_EVENT, load);
    }, [currentClub?.walletEnabled]);

    if (!currentClub?.walletEnabled || !totals) return null;
    const overdrawn = rows.filter((r) => isOverdrawn(r.balanceCents)).slice(0, 5);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-semibold text-slate-800">
                    <span className="p-2 bg-purple-50 text-[#774BBE] rounded-lg"><Wallet className="h-5 w-5" /></span>
                    Portefeuilles
                </h2>
                <Link href={`/wallet?clubID=${currentClub.id}`} className="text-sm font-medium text-[#774BBE] hover:underline">
                    Voir tout →
                </Link>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
                <span>À découvert : <strong>{totals.overdraftCount} membre{totals.overdraftCount > 1 ? "s" : ""}</strong></span>
                <span>Total dû : <strong className="font-mono tabular-nums text-red-600">{formatCents(totals.totalDueCents)}</strong></span>
                <span>Encaissé (mois) : <strong className="font-mono tabular-nums text-emerald-600">{formatSignedCents(totals.cashedThisMonthCents)}</strong></span>
            </div>

            <div className="h-px bg-slate-100" />

            {overdrawn.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Aucun membre à découvert.
                </p>
            ) : (
                <ul className="space-y-2">
                    {overdrawn.map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 min-w-0">
                                <span className="font-medium text-slate-800 truncate">{r.firstName} {r.lastName.toUpperCase()}</span>
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">{ROLE_LABELS[r.role]}</span>
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="font-mono tabular-nums font-semibold text-red-600">{formatCents(r.balanceCents)}</span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setDialogMember(r.id)}
                                    className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1"
                                >
                                    <CirclePlus className="h-3.5 w-3.5" /> Créditer
                                </Button>
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            <WalletOperationDialog
                open={dialogMember != null}
                onOpenChange={(o) => { if (!o) setDialogMember(null); }}
                members={rows.map((r) => ({ id: r.id, firstName: r.firstName, lastName: r.lastName, balanceCents: r.balanceCents }))}
                memberID={dialogMember}
                initialKind="CREDIT"
            />
        </div>
    );
};

export default WalletSummaryCard;
