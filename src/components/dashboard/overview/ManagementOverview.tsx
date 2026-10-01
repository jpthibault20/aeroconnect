"use client";

import React from "react";
import { ChevronRight, Inbox } from "lucide-react";
import { getClubOverview } from "@/api/db/stats";
import { formatEuros, formatEurosShort, formatMinutes } from "@/lib/clubStats";
import { ClubTab } from "@/lib/clubAccess";
import { cn } from "@/lib/utils";
import { WALLET_EVENT } from "@/lib/walletEvents";
import SeriesChart from "../stats/SeriesChart";
import { capitalize, hoursAxis } from "../stats/FlightCharts";
import { useStats } from "../stats/useStats";
import { BRAND, countDelta, percentDelta, SectionCard, SectionLabel, StatCard, StatsError, StatsSkeleton } from "../stats/StatsUI";
import PublicBookingLinkRow from "../PublicBookingLinkRow";

interface Props {
    clubID: string;
    publicToken: string | null;
    pendingMembers: number;
    pendingBaptemes: number;
    // Accessible tabs: a figure only links to a visible tab.
    tabs: ClubTab[];
    onNavigate: (tab: ClubTab) => void;
}

/**
 * Management overview (president, admin, manager): what needs handling, then the
 * current month's figures (flights and finances) compared with the previous
 * month. No practical club info: that is managed in Settings.
 */
const ManagementOverview = ({ clubID, publicToken, pendingMembers, pendingBaptemes, tabs, onNavigate }: Props) => {
    const { data, error, loading } = useStats(() => getClubOverview(), "overview", WALLET_EVENT);
    const overview = data?.overview;
    const pending = pendingMembers + pendingBaptemes;

    const goStats = tabs.includes("stats") ? () => onNavigate("stats") : undefined;
    const goWallet = tabs.includes("wallet") ? () => onNavigate("wallet") : undefined;

    const pendingDetail = [
        pendingMembers > 0 && `${pendingMembers} adhésion${pendingMembers > 1 ? "s" : ""}`,
        pendingBaptemes > 0 && `${pendingBaptemes} baptême${pendingBaptemes > 1 ? "s" : ""}`,
    ].filter(Boolean).join(" · ");

    return (
        <div className="flex flex-col gap-4">
            {pending > 0 && tabs.includes("todo") && (
                <button
                    type="button"
                    onClick={() => onNavigate("todo")}
                    className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-left transition-colors hover:bg-orange-100/70"
                >
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                        <Inbox className="h-5 w-5" />
                    </span>
                    <span className="flex flex-1 flex-col">
                        <span className="font-semibold text-orange-900">
                            {pending} demande{pending > 1 ? "s" : ""} à traiter
                        </span>
                        <span className="text-sm text-orange-800">{pendingDetail}</span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-orange-800" />
                </button>
            )}

            {error && <StatsError message={error} />}
            {!overview && !error && <StatsSkeleton />}

            {overview && (
                <div className={cn("flex flex-col gap-4 transition-opacity", loading && "opacity-60")}>
                    <div className="flex items-baseline justify-between gap-3">
                        <h2 className="text-lg font-bold text-slate-900">{capitalize(overview.currentLabel)}</h2>
                        <span className="text-xs text-slate-500">comparé à la même date le mois dernier</span>
                    </div>

                    <SectionLabel>Vols</SectionLabel>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatCard
                            label="Heures de vol"
                            value={formatMinutes(overview.flights.minutes)}
                            delta={percentDelta(overview.flights.minutes, overview.flights.previousMinutes, overview.comparisonLabel)}
                            onClick={goStats}
                        />
                        <StatCard
                            label="Vols"
                            value={String(overview.flights.flights)}
                            delta={percentDelta(overview.flights.flights, overview.flights.previousFlights, overview.comparisonLabel)}
                            onClick={goStats}
                        />
                        <StatCard
                            label="Élèves actifs"
                            value={String(overview.flights.students)}
                            delta={countDelta(overview.flights.students, overview.flights.previousStudents, overview.comparisonLabel)}
                            onClick={goStats}
                        />
                        <StatCard
                            label="Machine la plus utilisée"
                            value={overview.flights.topPlane?.label ?? "—"}
                            sub={overview.flights.topPlane ? `${formatMinutes(overview.flights.topPlane.value)} ce mois` : "aucun vol ce mois"}
                            onClick={goStats}
                        />
                    </div>

                    {overview.wallet && (
                        <>
                            <SectionLabel>Finances</SectionLabel>
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                <StatCard
                                    label="Encaissé"
                                    value={formatEuros(overview.wallet.cashedCents)}
                                    valueClassName="text-emerald-700"
                                    delta={percentDelta(overview.wallet.cashedCents, overview.wallet.previousCashedCents, overview.comparisonLabel)}
                                    onClick={goWallet}
                                />
                                <StatCard
                                    label="Facturé"
                                    value={formatEuros(overview.wallet.billedCents)}
                                    delta={percentDelta(overview.wallet.billedCents, overview.wallet.previousBilledCents, overview.comparisonLabel)}
                                    onClick={goWallet}
                                />
                                <StatCard
                                    label="Total dû"
                                    value={formatEuros(overview.wallet.totalDueCents)}
                                    valueClassName="text-red-700"
                                    sub="soldes négatifs"
                                    onClick={goWallet}
                                />
                                <StatCard
                                    label="À découvert"
                                    value={`${overview.wallet.overdraftCount} membre${overview.wallet.overdraftCount > 1 ? "s" : ""}`}
                                    sub="aujourd'hui"
                                    onClick={goWallet}
                                />
                            </div>
                        </>
                    )}

                    <SectionCard title="Activité · 6 derniers mois">
                        <div className={cn("grid grid-cols-1 gap-4", overview.wallet && "lg:grid-cols-2")}>
                            <div className="flex flex-col gap-1">
                                <span className="text-sm text-slate-600">Heures de vol</span>
                                <SeriesChart
                                    data={overview.activity.map((p) => ({ label: p.label, minutes: p.minutes }))}
                                    series={[{ key: "minutes", name: "Heures de vol", color: BRAND }]}
                                    format={formatMinutes}
                                    formatAxis={hoursAxis}
                                    height={150}
                                />
                            </div>
                            {overview.wallet && (
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm text-slate-600">Encaissé</span>
                                    <SeriesChart
                                        data={overview.activity.map((p) => ({ label: p.label, cashed: p.cashedCents }))}
                                        series={[{ key: "cashed", name: "Encaissé", color: "#0f9f7a" }]}
                                        format={formatEuros}
                                        formatAxis={formatEurosShort}
                                        height={150}
                                    />
                                </div>
                            )}
                        </div>
                        {(goStats || goWallet) && (
                            <div className="grid grid-cols-2 gap-2">
                                {goStats && (
                                    <button type="button" onClick={goStats} className="min-h-11 rounded-xl border border-slate-200 text-sm font-semibold text-[#774BBE] hover:bg-purple-50/50">
                                        Statistiques →
                                    </button>
                                )}
                                {goWallet && (
                                    <button type="button" onClick={goWallet} className="min-h-11 rounded-xl border border-slate-200 text-sm font-semibold text-[#774BBE] hover:bg-purple-50/50">
                                        Portefeuilles →
                                    </button>
                                )}
                            </div>
                        )}
                    </SectionCard>
                </div>
            )}

            <PublicBookingLinkRow clubID={clubID} token={publicToken} />
        </div>
    );
};

export default ManagementOverview;
