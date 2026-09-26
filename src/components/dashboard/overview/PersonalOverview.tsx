"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getMyFlightStats, getMyInstructionStats } from "@/api/db/stats";
import { getMyWalletStatus } from "@/api/db/wallet";
import { formatEuros, formatMinutes, formatMinutesDelta, StatsPeriod } from "@/lib/clubStats";
import { cn } from "@/lib/utils";
import { WALLET_EVENT } from "@/lib/walletEvents";
import { capitalize, FlightSeriesCard, flightsDetail } from "../stats/FlightCharts";
import { useStats } from "../stats/useStats";
import { countDelta, Delta, PeriodSelector, RankList, SectionCard, SectionLabel, StatCard, StatsError, StatsSkeleton } from "../stats/StatsUI";
import ClubInfoCard from "../ClubInfoCard";
import PublicBookingLinkRow from "../PublicBookingLinkRow";

interface Props {
    kind: "pilot" | "instructor";
    clubID: string;
    publicToken: string | null;
}

const minutesDelta = (current: number, previous: number, comparisonLabel: string): Delta => {
    const diff = current - previous;
    return {
        text: `${formatMinutesDelta(diff)} ${comparisonLabel}`,
        tone: Math.round(diff) > 0 ? "up" : Math.round(diff) < 0 ? "down" : "neutral",
    };
};

/** Solde du portefeuille de l'utilisateur connecté, null si désactivé. */
function useMyBalance(enabled: boolean) {
    const [balance, setBalance] = useState<number | null>(null);
    useEffect(() => {
        if (!enabled) return;
        const load = () =>
            getMyWalletStatus()
                .then((res) => setBalance(res.success && res.enabled ? res.balanceCents : null))
                .catch(() => setBalance(null));
        load();
        window.addEventListener(WALLET_EVENT, load);
        return () => window.removeEventListener(WALLET_EVENT, load);
    }, [enabled]);
    return balance;
}

/**
 * Aperçu personnel : élève et pilote voient leurs vols, l'instructeur ses vols
 * d'instruction. Les informations pratiques du club sont en bas de page.
 */
const PersonalOverview = ({ kind, clubID, publicToken }: Props) => {
    const [period, setPeriod] = useState<StatsPeriod>("month");
    const instructor = kind === "instructor";
    const { data, error, loading } = useStats(
        () => (instructor ? getMyInstructionStats(period) : getMyFlightStats(period)),
        `${kind}:${period}`
    );
    const balance = useMyBalance(!instructor);
    const stats = data?.stats;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <h2 className="text-lg font-bold text-slate-900">{instructor ? "Mes vols d'instruction" : "Mes vols"}</h2>
                <PeriodSelector value={period} onChange={setPeriod} className="sm:w-96" />
                {stats && (
                    <p className="text-xs text-slate-500">
                        {capitalize(stats.currentLabel)}, comparé à {stats.period === "rolling12" ? "l'année précédente" : stats.previousLabel} à la même date
                    </p>
                )}
            </div>

            {error && <StatsError message={error} />}
            {!stats && !error && <StatsSkeleton />}

            {stats && (
                <div className={cn("flex flex-col gap-4 transition-opacity", loading && "opacity-60")}>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatCard
                            label={instructor ? "Heures d'instruction" : "Heures de vol"}
                            value={formatMinutes(stats.minutes)}
                            delta={minutesDelta(stats.minutes, stats.previousMinutes, stats.comparisonLabel)}
                        />
                        <StatCard
                            label="Vols"
                            value={String(stats.flights)}
                            delta={countDelta(stats.flights, stats.previousFlights, stats.comparisonLabel)}
                        />
                        {instructor ? (
                            <StatCard
                                label="Élèves suivis"
                                value={String(stats.students)}
                                delta={countDelta(stats.students, stats.previousStudents, stats.comparisonLabel)}
                            />
                        ) : (
                            <StatCard
                                label="Durée moyenne"
                                value={stats.flights ? formatMinutes(stats.minutes / stats.flights) : "—"}
                                sub="par vol"
                            />
                        )}
                        {!instructor && balance != null ? (
                            <StatCard
                                label="Mon solde"
                                value={formatEuros(balance)}
                                valueClassName={balance < 0 ? "text-red-700" : "text-emerald-700"}
                                sub="portefeuille"
                            />
                        ) : (
                            <StatCard
                                label={instructor ? "Durée moyenne" : "Machines"}
                                value={instructor
                                    ? (stats.flights ? formatMinutes(stats.minutes / stats.flights) : "—")
                                    : String(stats.byPlane.length)}
                                sub={instructor ? "par vol" : "utilisées"}
                            />
                        )}
                    </div>

                    <FlightSeriesCard stats={stats} />

                    <div className={cn("grid grid-cols-1 gap-4", instructor && "lg:grid-cols-2")}>
                        <SectionCard title={instructor ? "Par machine" : "Mes vols par machine"}>
                            <RankList rows={stats.byPlane} format={formatMinutes} detail={flightsDetail} emptyText="Aucun vol sur la période." />
                        </SectionCard>
                        {instructor && (
                            <SectionCard title="Mes élèves">
                                <RankList rows={stats.byStudent} format={formatMinutes} detail={flightsDetail} emptyText="Aucun vol d'instruction sur la période." />
                            </SectionCard>
                        )}
                    </div>

                    <Link
                        href={`/logbook?clubID=${clubID}`}
                        className="flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-[#774BBE] hover:bg-purple-50/50"
                    >
                        Voir mon carnet de vol →
                    </Link>
                </div>
            )}

            <div className="mt-4 flex flex-col gap-3">
                <SectionLabel>Infos pratiques du club</SectionLabel>
                <ClubInfoCard title="Infos pratiques" />
                <PublicBookingLinkRow clubID={clubID} token={publicToken} />
            </div>
        </div>
    );
};

export default PersonalOverview;
