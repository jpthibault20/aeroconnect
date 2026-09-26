"use client";

import React, { useState } from "react";
import { getClubWalletStats } from "@/api/db/stats";
import { formatEuros, formatEurosShort, StatsPeriod, WalletMode } from "@/lib/clubStats";
import { cn } from "@/lib/utils";
import { WALLET_EVENT } from "@/lib/walletEvents";
import SeriesChart from "./stats/SeriesChart";
import { capitalize } from "./stats/FlightCharts";
import { useStats } from "./stats/useStats";
import {
    BRAND,
    percentDelta,
    PeriodSelector,
    RankList,
    SectionCard,
    Segmented,
    StatCard,
    StatsError,
    StatsSkeleton,
} from "./stats/StatsUI";
import WalletSummaryCard from "./WalletSummaryCard";

/**
 * Onglet « Portefeuilles » (gestion, portefeuille activé) : encaissé ou
 * facturé sur la période, par mois, par membre et par machine.
 */

const CASHED_COLOR = "#0f9f7a";

const MODES: { id: WalletMode; label: string }[] = [
    { id: "cashed", label: "Encaissé" },
    { id: "billed", label: "Facturé" },
];

const WalletTab = () => {
    const [mode, setMode] = useState<WalletMode>("cashed");
    const [period, setPeriod] = useState<StatsPeriod>("month");
    const { data, error, loading } = useStats(() => getClubWalletStats(period), period, WALLET_EVENT);

    const stats = data?.stats;
    const cashed = mode === "cashed";
    const current = stats?.[mode];
    const other = stats?.[cashed ? "billed" : "cashed"];
    const modeLabel = cashed ? "Encaissé" : "Facturé";
    const color = cashed ? CASHED_COLOR : BRAND;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <Segmented options={MODES} value={mode} onChange={setMode} ariaLabel="Montants affichés" tone="brand" className="lg:w-72" />
                <PeriodSelector value={period} onChange={setPeriod} className="lg:w-96" />
            </div>
            {stats && (
                <p className="text-xs text-slate-500">
                    {capitalize(stats.currentLabel)} · {cashed ? "paiements reçus (crédits)" : "vols débités aux élèves"}
                </p>
            )}

            {error && <StatsError message={error} />}
            {!stats && !error && <StatsSkeleton />}

            {stats && current && other && data && (
                <div className={cn("flex flex-col gap-4 transition-opacity", loading && "opacity-60")}>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatCard
                            label={modeLabel}
                            value={formatEuros(current.total)}
                            valueClassName={cashed ? "text-emerald-700" : undefined}
                            delta={percentDelta(current.total, current.previousTotal, stats.comparisonLabel)}
                        />
                        <StatCard
                            label={cashed ? "Facturé (rappel)" : "Encaissé (rappel)"}
                            value={formatEuros(other.total)}
                            valueClassName="text-slate-600"
                            sub="même période"
                        />
                        <StatCard label="Total dû" value={formatEuros(data.totalDueCents)} valueClassName="text-red-700" sub="soldes négatifs" />
                        <StatCard
                            label="À découvert"
                            value={`${data.overdraftCount} membre${data.overdraftCount > 1 ? "s" : ""}`}
                            sub="aujourd'hui"
                        />
                    </div>

                    <SectionCard
                        title={`${modeLabel} par ${stats.bucketUnit === "week" ? "semaine" : "mois"}`}
                        right={<>Total <strong className="text-slate-900">{formatEuros(current.total)}</strong></>}
                    >
                        <SeriesChart
                            data={current.series.map((p) => ({ label: p.label, current: p.current, previous: p.previous }))}
                            series={[
                                { key: "current", name: capitalize(stats.currentLabel), color },
                                { key: "previous", name: "Période précédente", color: "#cbd5e1" },
                            ]}
                            format={formatEuros}
                            formatAxis={formatEurosShort}
                        />
                    </SectionCard>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <SectionCard title={`${modeLabel} par membre`}>
                            <RankList
                                rows={current.byMember}
                                format={formatEuros}
                                color={color}
                                emptyText={cashed ? "Aucun paiement sur la période." : "Aucun vol facturé sur la période."}
                            />
                        </SectionCard>
                        {/* Toujours en facturé, quel que soit le mode : un paiement
                            n'est rattaché à aucune machine. */}
                        <SectionCard title="Facturé par machine">
                            <RankList rows={stats.billed.byPlane} format={formatEuros} emptyText="Aucun vol facturé sur la période." />
                        </SectionCard>
                    </div>
                </div>
            )}

            <WalletSummaryCard />
        </div>
    );
};

export default WalletTab;
