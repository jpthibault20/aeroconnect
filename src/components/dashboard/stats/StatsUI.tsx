"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { percentChange, RankRow, STATS_PERIODS, StatsPeriod } from "@/lib/clubStats";

/**
 * Briques d'affichage communes aux statistiques de la page « Club » (AER-68) :
 * sélecteur de période, cartes de chiffres clés, classements en barres.
 */

export const BRAND = "#774BBE";

// ─── Sélecteurs ───

interface SegmentedProps<T extends string> {
    options: { id: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
    ariaLabel: string;
    tone?: "neutral" | "brand";
    className?: string;
}

export function Segmented<T extends string>({ options, value, onChange, ariaLabel, tone = "neutral", className }: SegmentedProps<T>) {
    return (
        <div role="group" aria-label={ariaLabel} className={cn("flex gap-0.5 rounded-xl bg-slate-200/70 p-1", className)}>
            {options.map((o) => {
                const active = o.id === value;
                return (
                    <button
                        key={o.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(o.id)}
                        className={cn(
                            "flex-1 min-h-10 rounded-lg px-3 text-sm transition-colors whitespace-nowrap",
                            active
                                ? tone === "brand"
                                    ? "bg-[#774BBE] text-white font-semibold shadow-sm"
                                    : "bg-white text-slate-900 font-semibold shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                        )}
                    >
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

export function PeriodSelector({ value, onChange, className }: { value: StatsPeriod; onChange: (p: StatsPeriod) => void; className?: string }) {
    return <Segmented options={STATS_PERIODS} value={value} onChange={onChange} ariaLabel="Période" className={className} />;
}

// ─── Chiffres clés ───

export type DeltaTone = "up" | "down" | "neutral";

export interface Delta {
    text: string;
    tone: DeltaTone;
}

/** « +8 % vs août » ; null si pas de base de comparaison. */
export function percentDelta(current: number, previous: number, comparisonLabel: string): Delta | null {
    const pct = percentChange(current, previous);
    if (pct == null) return null;
    return {
        text: `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct)} % ${comparisonLabel}`,
        tone: pct > 0 ? "up" : pct < 0 ? "down" : "neutral",
    };
}

/** « +2 vs août » pour un compte. */
export function countDelta(current: number, previous: number, comparisonLabel: string): Delta {
    const diff = current - previous;
    return {
        text: `${diff > 0 ? "+" : diff < 0 ? "−" : "±"}${Math.abs(diff)} ${comparisonLabel}`,
        tone: diff > 0 ? "up" : diff < 0 ? "down" : "neutral",
    };
}

const deltaClass: Record<DeltaTone, string> = {
    up: "text-emerald-700",
    down: "text-amber-700",
    neutral: "text-slate-500",
};

interface StatCardProps {
    label: string;
    value: string;
    delta?: Delta | null;
    sub?: string;
    valueClassName?: string;
    onClick?: () => void;
}

export function StatCard({ label, value, delta, sub, valueClassName, onClick }: StatCardProps) {
    const content = (
        <>
            <span className="text-xs text-slate-500">{label}</span>
            <span className={cn("text-xl sm:text-2xl font-bold tabular-nums text-slate-900 truncate", valueClassName)}>{value}</span>
            {delta ? (
                <span className={cn("text-xs font-semibold", deltaClass[delta.tone])}>{delta.text}</span>
            ) : (
                <span className="text-xs text-slate-500">{sub ?? " "}</span>
            )}
        </>
    );
    const className = "flex min-w-0 flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm";
    return onClick ? (
        <button type="button" onClick={onClick} className={cn(className, "transition-colors hover:border-[#774BBE]/50 hover:bg-purple-50/30")}>
            {content}
        </button>
    ) : (
        <div className={className}>{content}</div>
    );
}

// ─── Cartes ───

export function SectionCard({ title, right, children, className }: { title: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
    return (
        <section className={cn("flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5", className)}>
            <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-semibold text-slate-900">{title}</h3>
                {right && <div className="text-sm text-slate-500">{right}</div>}
            </div>
            {children}
        </section>
    );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
    return <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{children}</h3>;
}

export function EmptyHint({ children }: { children: React.ReactNode }) {
    return <p className="py-6 text-center text-sm text-slate-500">{children}</p>;
}

// ─── Classements ───

interface RankListProps {
    rows: RankRow[];
    format: (value: number) => string;
    // Texte complémentaire à gauche de la valeur (ex. « 4 vols »).
    detail?: (row: RankRow) => string | null;
    limit?: number;
    emptyText: string;
    color?: string;
}

export function RankList({ rows, format, detail, limit = 5, emptyText, color = BRAND }: RankListProps) {
    const [expanded, setExpanded] = useState(false);
    if (rows.length === 0) return <EmptyHint>{emptyText}</EmptyHint>;

    const max = Math.max(...rows.map((r) => r.value), 1);
    const visible = expanded ? rows : rows.slice(0, limit);

    return (
        <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-3">
                {visible.map((row) => {
                    const extra = detail?.(row);
                    return (
                        <li key={row.key} className="flex flex-col gap-1.5">
                            <div className="flex items-baseline justify-between gap-3 text-sm">
                                <span className="min-w-0 truncate">
                                    <span className="font-semibold text-slate-800">{row.label}</span>
                                    {row.sub && row.sub !== row.label && <span className="ml-1.5 text-slate-500">{row.sub}</span>}
                                </span>
                                <span className="flex-shrink-0 tabular-nums">
                                    {extra && <span className="mr-1.5 text-slate-500">{extra} ·</span>}
                                    <span className="font-semibold text-slate-900">{format(row.value)}</span>
                                </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full"
                                    style={{ width: `${Math.max(2, Math.round((row.value / max) * 100))}%`, background: color }}
                                />
                            </div>
                        </li>
                    );
                })}
            </ul>
            {rows.length > limit && (
                <button
                    type="button"
                    onClick={() => setExpanded((e) => !e)}
                    className="min-h-11 rounded-xl border border-slate-200 text-sm font-semibold text-[#774BBE] hover:bg-purple-50/50"
                >
                    {expanded ? "Réduire" : `Voir les ${rows.length}`}
                </button>
            )}
        </div>
    );
}

// ─── Chargement ───

export function StatsSkeleton({ cards = 4 }: { cards?: number }) {
    return (
        <div className="flex flex-col gap-4 animate-pulse" aria-busy="true" aria-label="Chargement des statistiques">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {Array.from({ length: cards }, (_, i) => (
                    <div key={i} className="h-24 rounded-2xl bg-slate-200/70" />
                ))}
            </div>
            <div className="h-64 rounded-2xl bg-slate-200/70" />
        </div>
    );
}

export function StatsError({ message }: { message: string }) {
    return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}</p>;
}
