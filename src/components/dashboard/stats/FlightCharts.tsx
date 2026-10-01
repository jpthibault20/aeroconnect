"use client";

import React from "react";
import { FlightStats, formatMinutes, RankRow } from "@/lib/clubStats";
import SeriesChart from "./SeriesChart";
import { BRAND, SectionCard } from "./StatsUI";

export const flightsDetail = (row: RankRow) => `${row.count} vol${row.count > 1 ? "s" : ""}`;
export const hoursAxis = (minutes: number) => `${Math.round(minutes / 60)} h`;
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function FlightSeriesCard({ stats }: { stats: FlightStats }) {
    return (
        <SectionCard
            title={stats.bucketUnit === "week" ? "Heures par semaine" : "Heures par mois"}
            right={<>Total <strong className="text-slate-900">{formatMinutes(stats.minutes)}</strong></>}
        >
            <SeriesChart
                data={stats.series.map((p) => ({ label: p.label, current: p.current, previous: p.previous }))}
                series={[
                    { key: "current", name: capitalize(stats.currentLabel), color: BRAND },
                    { key: "previous", name: capitalize(stats.previousLabel), color: "#cbd5e1" },
                ]}
                format={formatMinutes}
                formatAxis={hoursAxis}
            />
        </SectionCard>
    );
}
