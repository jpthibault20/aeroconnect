"use client";

import React, { useState } from "react";
import { getClubFlightStats } from "@/api/db/stats";
import { formatMinutes, StatsPeriod } from "@/lib/clubStats";
import { cn } from "@/lib/utils";
import { capitalize, FlightSeriesCard, flightsDetail } from "./stats/FlightCharts";
import { useStats } from "./stats/useStats";
import {
    countDelta,
    percentDelta,
    PeriodSelector,
    RankList,
    SectionCard,
    StatCard,
    StatsError,
    StatsSkeleton,
} from "./stats/StatsUI";

/**
 * Onglet « Statistiques » (gestion) : activité du club sur la période choisie,
 * calculée sur le carnet de vol.
 */

const StatsTab = () => {
    const [period, setPeriod] = useState<StatsPeriod>("month");
    const { data, error, loading } = useStats(() => getClubFlightStats(period), period);
    const stats = data?.stats;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <PeriodSelector value={period} onChange={setPeriod} className="sm:w-96" />
                {stats && (
                    <p className="text-xs text-slate-500">
                        {capitalize(stats.currentLabel)} · source : carnet de vol
                    </p>
                )}
            </div>

            {error && <StatsError message={error} />}
            {!stats && !error && <StatsSkeleton />}

            {stats && (
                <div className={cn("flex flex-col gap-4 transition-opacity", loading && "opacity-60")}>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatCard
                            label="Heures de vol"
                            value={formatMinutes(stats.minutes)}
                            delta={percentDelta(stats.minutes, stats.previousMinutes, stats.comparisonLabel)}
                        />
                        <StatCard
                            label="Vols"
                            value={String(stats.flights)}
                            delta={percentDelta(stats.flights, stats.previousFlights, stats.comparisonLabel)}
                        />
                        <StatCard
                            label="Durée moyenne"
                            value={stats.flights ? formatMinutes(stats.minutes / stats.flights) : "—"}
                            sub="par vol"
                        />
                        <StatCard
                            label="Élèves actifs"
                            value={String(stats.students)}
                            delta={countDelta(stats.students, stats.previousStudents, stats.comparisonLabel)}
                        />
                    </div>

                    <FlightSeriesCard stats={stats} />

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <SectionCard title="Heures par machine">
                            <RankList rows={stats.byPlane} format={formatMinutes} detail={flightsDetail} emptyText="Aucun vol sur la période." />
                        </SectionCard>
                        <SectionCard title="Heures par instructeur">
                            <RankList rows={stats.byInstructor} format={formatMinutes} detail={flightsDetail} emptyText="Aucun vol d'instruction sur la période." />
                        </SectionCard>
                        <SectionCard title="Heures par élève">
                            <RankList rows={stats.byStudent} format={formatMinutes} detail={flightsDetail} emptyText="Aucun élève n'a volé sur la période." />
                        </SectionCard>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatsTab;
