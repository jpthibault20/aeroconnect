"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Histogramme d'une ou deux séries par tranche (semaine / mois), lisible sur
 * téléphone : pas de légende Recharts (la légende est rendue en HTML au-dessus),
 * étiquettes d'axe masquées automatiquement si elles se chevauchent.
 */

export interface ChartSeries {
    key: string;
    name: string;
    color: string;
}

interface Props {
    data: Record<string, string | number>[];
    series: ChartSeries[];
    format: (value: number) => string;
    formatAxis?: (value: number) => string;
    height?: number;
}

export function ChartLegend({ series }: { series: ChartSeries[] }) {
    if (series.length < 2) return null;
    return (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            {series.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                    {s.name}
                </span>
            ))}
        </div>
    );
}

const SeriesChart = ({ data, series, format, formatAxis, height = 220 }: Props) => (
    <div className="flex flex-col gap-3">
        <ChartLegend series={series} />
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }} barCategoryGap={series.length > 1 ? "18%" : "28%"} barGap={2}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    interval="preserveStartEnd"
                    minTickGap={6}
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickFormatter={(v: number) => (formatAxis ?? format)(v)}
                    width={48}
                    allowDecimals={false}
                />
                <Tooltip
                    cursor={{ fill: "rgba(119, 75, 190, 0.06)" }}
                    formatter={(value: number, name: string) => [format(value), name]}
                    contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 13 }}
                />
                {series.map((s) => (
                    <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={28} />
                ))}
            </BarChart>
        </ResponsiveContainer>
    </div>
);

export default SeriesChart;
