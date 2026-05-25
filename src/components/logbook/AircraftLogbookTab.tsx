"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { flight_logs, planes } from "@prisma/client";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { convertMinutesToHours } from "@/api/global function/dateServeur";
import { computeFlightTimesWithFallback, formatNature } from "@/lib/logbookCalc";
import { getPlaneHobbs } from "@/api/db/logbook";
import SignFlightLogButton from "./SignFlightLogButton";
import LogbookFilter from "./LogbookFilter";
import CompleteFlightDialog from "./CompleteFlightDialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plane, BookOpen, ChevronLeft, ChevronRight, ArrowRight, RotateCw, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

interface Props {
    logs: flight_logs[];
    planes: planes[];
    onPlaneChange?: (planeID: string) => void;
    onFilteredLogsChange?: (logs: flight_logs[]) => void;
    onLogUpdated?: (updated: flight_logs) => void;
}

const AircraftLogbookTab = ({ logs: logsProp, planes: planesList, onPlaneChange, onFilteredLogsChange, onLogUpdated }: Props) => {
    const { currentClub } = useCurrentClub();
    const defaultAirfield = currentClub?.id ?? undefined;
    const [selectedPlaneID, setSelectedPlaneID] = useState<string>("ALL");

    const [editingLog, setEditingLog] = useState<flight_logs | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editDefaultHobbsStart, setEditDefaultHobbsStart] = useState<number | undefined>(undefined);

    useEffect(() => {
        onPlaneChange?.(selectedPlaneID);
    }, [selectedPlaneID, onPlaneChange]);

    const [natureFilter, setNatureFilter] = useState<string | undefined>(undefined);
    const [onlyUnsigned, setOnlyUnsigned] = useState(false);
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [filtersKey, setFiltersKey] = useState(0);
    const [page, setPage] = useState(0);

    const planeLogs = useMemo(() => {
        let filtered = logsProp;
        if (selectedPlaneID !== "ALL") {
            filtered = filtered.filter((l) => l.planeID === selectedPlaneID);
        }
        if (natureFilter) {
            filtered = filtered.filter((l) => l.flightNature === natureFilter);
        }
        if (onlyUnsigned) {
            filtered = filtered.filter((l) => !l.pilotSigned);
        }
        const sorted = [...filtered].sort((a, b) => {
            const da = new Date(a.date).getTime();
            const db = new Date(b.date).getTime();
            return sortDir === "desc" ? db - da : da - db;
        });
        return sorted;
    }, [logsProp, selectedPlaneID, natureFilter, onlyUnsigned, sortDir]);

    useEffect(() => {
        setPage(0);
    }, [selectedPlaneID, natureFilter, onlyUnsigned, sortDir]);

    // Hobbs courant par avion, pour estimer une durée provisoire des vols non
    // signés (hobbsStart pas encore figé).
    const planeHobbsMap = useMemo(() => {
        const m = new Map<string, number | null>();
        for (const p of planesList) m.set(p.id, p.hobbsTotal ?? null);
        return m;
    }, [planesList]);

    useEffect(() => {
        // Export officiel : on ne transmet que les vols signés (durée définitive).
        onFilteredLogsChange?.(planeLogs.filter((l) => l.pilotSigned));
    }, [planeLogs, onFilteredLogsChange]);

    const totalPages = Math.ceil(planeLogs.length / PAGE_SIZE);
    const paginatedLogs = useMemo(
        () => planeLogs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
        [planeLogs, page]
    );

    const goNext = useCallback(() => setPage((p) => Math.min(p + 1, totalPages - 1)), [totalPages]);
    const goPrev = useCallback(() => setPage((p) => Math.max(p - 1, 0)), []);

    const handleSigned = useCallback((updated: flight_logs) => {
        onLogUpdated?.(updated);
    }, [onLogUpdated]);

    const handleRowClick = useCallback(async (log: flight_logs) => {
        setEditingLog(log);
        setEditDefaultHobbsStart(undefined);
        setEditOpen(true);

        // Pré-remplir l'heure moteur de début avec le hobbsTotal courant de
        // l'avion (cohérent avec PilotLogbookTab et la popup post-session).
        if (log.planeID && log.hobbsStart == null) {
            const hobbs = await getPlaneHobbs(log.planeID);
            if (hobbs != null) setEditDefaultHobbsStart(hobbs);
        }
    }, []);

    const handleEditCompleted = useCallback((updated: flight_logs) => {
        onLogUpdated?.(updated);
        setEditOpen(false);
        setEditingLog(null);
        setEditDefaultHobbsStart(undefined);
    }, [onLogUpdated]);

    return (
        <div className="flex flex-col lg:h-full gap-6">
            {/* Controls bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                <Select
                    value={selectedPlaneID}
                    onValueChange={(val) => { setSelectedPlaneID(val); onPlaneChange?.(val); }}
                >
                    <SelectTrigger className="w-full sm:w-[240px] bg-white border-slate-200 focus:ring-[#774BBE]">
                        <SelectValue placeholder="Selectionner un aeronef" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Tous les aeronefs</SelectItem>
                        {planesList.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                                {p.name} ({p.immatriculation})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <LogbookFilter key={filtersKey} onFilterChange={(f) => setNatureFilter(f.nature)} />

                <div className="flex items-center gap-2 px-3 h-9 bg-white border border-slate-200 rounded-md">
                    <Switch
                        id="aircraft-only-unsigned"
                        checked={onlyUnsigned}
                        onCheckedChange={setOnlyUnsigned}
                        className="data-[state=checked]:bg-[#774BBE]"
                    />
                    <Label htmlFor="aircraft-only-unsigned" className="text-sm text-slate-600 cursor-pointer whitespace-nowrap">
                        À signer
                    </Label>
                </div>
            </div>

            {/* Content */}
            {planeLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                        <Plane className="w-8 h-8 text-[#774BBE]" />
                    </div>
                    {logsProp.length === 0 ? (
                        <>
                            <p className="text-slate-800 font-semibold mb-1">Aucun vol enregistré</p>
                            <p className="text-slate-500 text-sm max-w-sm">
                                Les vols apparaîtront ici dès qu&apos;une session sera complétée sur l&apos;un de vos aéronefs.
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-slate-800 font-semibold mb-1">Aucun vol pour ces filtres</p>
                            <p className="text-slate-500 text-sm max-w-sm mb-4">
                                Essayez d&apos;élargir la sélection pour voir des résultats.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSelectedPlaneID("ALL");
                                    setNatureFilter(undefined);
                                    setOnlyUnsigned(false);
                                    setFiltersKey((k) => k + 1);
                                }}
                                className="border-slate-200"
                            >
                                Réinitialiser les filtres
                            </Button>
                        </>
                    )}
                </div>
            ) : (
                <>
                    {/* Desktop table */}
                    <div className="hidden lg:flex lg:flex-col flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-y-auto">
                        <table className="w-full">
                            <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgba(15,23,42,0.06)]">
                                <tr>
                                    <th className="pl-4 pr-2.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                                        <button
                                            type="button"
                                            onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                                            className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors"
                                        >
                                            Date
                                            {sortDir === "desc"
                                                ? <ArrowDown className="w-3 h-3" />
                                                : <ArrowUp className="w-3 h-3" />
                                            }
                                        </button>
                                    </th>
                                    <th className="px-2.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Pilote</th>
                                    <th className="px-2.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Nature</th>
                                    <th className="px-2.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Trajet</th>
                                    <th className="px-2.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Durée</th>
                                    <th className="px-2.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Hobbs</th>
                                    <th className="px-2.5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Mouv.</th>
                                    <th className="px-2.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Carb.</th>
                                    <th className="px-2.5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Anom.</th>
                                    <th className="px-2.5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Signé</th>
                                    <th className="w-6"></th>
                                </tr>
                            </thead>
                            <tbody>
                                    {paginatedLogs.map((log) => {
                                        const times = computeFlightTimesWithFallback(
                                            log,
                                            log.planeID ? planeHobbsMap.get(log.planeID) : null
                                        );
                                        const hasAnomaly = log.machineAnomalies && log.machineAnomalies.trim() !== "" && log.machineAnomalies.trim().toUpperCase() !== "RAS";
                                        const sameAirfield = log.departureAirfield && log.arrivalAirfield && log.departureAirfield === log.arrivalAirfield;
                                        const showTrajet = log.departureAirfield || log.arrivalAirfield;
                                        return (
                                        <tr
                                            key={log.id}
                                            className="transition-colors even:bg-slate-50/40 hover:bg-purple-50/40 cursor-pointer"
                                            onClick={() => handleRowClick(log)}
                                        >
                                            <td className={cn(
                                                "pl-4 pr-2.5 py-2.5 text-[13px] text-slate-800 font-medium whitespace-nowrap border-l-4",
                                                log.pilotSigned ? "border-l-transparent" : "border-l-amber-300"
                                            )}>
                                                {new Date(log.date).toLocaleDateString("fr-FR")}
                                            </td>
                                            <td className="px-2.5 py-2.5 text-[13px] text-slate-800 font-medium whitespace-nowrap">
                                                {log.pilotFirstName} {log.pilotLastName}
                                            </td>
                                            <td className="px-2.5 py-2.5 text-[13px] text-slate-600 whitespace-nowrap">
                                                {formatNature(log.flightNature, log.instructionSubType)}
                                            </td>
                                            <td className="px-2.5 py-2.5 font-mono text-[12px] tabular-nums uppercase text-slate-600 whitespace-nowrap">
                                                {showTrajet ? (
                                                    sameAirfield ? (
                                                        <span className="inline-flex items-center gap-1">
                                                            {log.departureAirfield}
                                                            <RotateCw className="w-3 h-3 text-slate-400" />
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-0.5">
                                                            {log.departureAirfield ?? "—"}
                                                            <ArrowRight className="w-3 h-3 text-slate-300 mx-0.5" />
                                                            {log.arrivalAirfield ?? "—"}
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className={cn(
                                                "px-2.5 py-2.5 text-right font-mono text-[12.5px] tabular-nums font-medium",
                                                times.provisional ? "text-slate-400 italic" : "text-slate-800"
                                            )}>
                                                {times.durationMinutes > 0 ? (
                                                    <span title={times.provisional ? "Durée provisoire — définitive à la signature" : undefined}>
                                                        {times.provisional ? "~" : ""}{convertMinutesToHours(times.durationMinutes)}
                                                    </span>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="px-2.5 py-2.5 text-right font-mono text-[12px] tabular-nums text-slate-600 whitespace-nowrap">
                                                {log.hobbsStart != null && log.hobbsEnd != null ? (
                                                    <span className="inline-flex items-center gap-0.5">
                                                        {log.hobbsStart.toFixed(1)}
                                                        <ArrowRight className="w-3 h-3 text-slate-300 mx-0.5" />
                                                        {log.hobbsEnd.toFixed(1)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className="px-2.5 py-2.5 text-center font-mono text-[12.5px] tabular-nums text-slate-600">{log.landings}</td>
                                            <td className="px-2.5 py-2.5 text-right font-mono text-[12.5px] tabular-nums text-slate-600">
                                                {log.fuelAdded != null ? `${log.fuelAdded.toFixed(1)}L` : <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="px-2.5 py-2.5 text-center">
                                                <span
                                                    className={cn(
                                                        "inline-block w-2 h-2 rounded-full",
                                                        hasAnomaly ? "bg-red-500 ring-2 ring-red-100" : "bg-emerald-400"
                                                    )}
                                                    title={hasAnomaly ? log.machineAnomalies! : "RAS"}
                                                />
                                            </td>
                                            <td className="px-2.5 py-2.5 text-center">
                                                <SignFlightLogButton log={log} onSigned={handleSigned} onTriggerEdit={() => handleRowClick(log)} />
                                            </td>
                                            <td className="pr-3 py-2.5 text-right">
                                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 inline" />
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-1 py-2 shrink-0">
                            <span className="text-sm text-slate-500">
                                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, planeLogs.length)} sur {planeLogs.length}
                            </span>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="sm" onClick={goPrev} disabled={page === 0} className="h-8 w-8 p-0">
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-sm text-slate-600 px-2">{page + 1} / {totalPages}</span>
                                <Button variant="outline" size="sm" onClick={goNext} disabled={page >= totalPages - 1} className="h-8 w-8 p-0">
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Mobile cards */}
                    <div className="lg:hidden flex flex-col gap-3 pb-20">
                        {paginatedLogs.map((log) => {
                            const times = computeFlightTimesWithFallback(
                                log,
                                log.planeID ? planeHobbsMap.get(log.planeID) : null
                            );
                            const hasAnomaly = log.machineAnomalies && log.machineAnomalies.trim() !== "" && log.machineAnomalies.trim().toUpperCase() !== "RAS";
                            const sameAirfield = log.departureAirfield && log.arrivalAirfield && log.departureAirfield === log.arrivalAirfield;
                            return (
                            <div
                                key={log.id}
                                className={cn(
                                    "bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2.5 border-l-4 cursor-pointer active:bg-slate-50",
                                    log.pilotSigned ? "border-l-slate-200" : "border-l-amber-300"
                                )}
                                onClick={() => handleRowClick(log)}
                            >
                                {/* Ligne 1 : date + statut signé */}
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-slate-800">
                                        {new Date(log.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                                    </span>
                                    <SignFlightLogButton log={log} onSigned={handleSigned} />
                                </div>

                                {/* Ligne 2 : pilote + durée */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-700 truncate">
                                        {log.pilotFirstName} {log.pilotLastName}
                                    </span>
                                    <span className={cn(
                                        "ml-auto font-mono text-[13px] tabular-nums font-semibold",
                                        times.provisional ? "text-slate-400 italic" : "text-slate-800"
                                    )}>
                                        {times.durationMinutes > 0 ? (
                                            <span title={times.provisional ? "Durée provisoire — définitive à la signature" : undefined}>
                                                {times.provisional ? "~" : ""}{convertMinutesToHours(times.durationMinutes)}
                                            </span>
                                        ) : <span className="text-slate-300">--:--</span>}
                                    </span>
                                </div>

                                {/* Ligne 3 : nature + trajet */}
                                <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                                    <span>{formatNature(log.flightNature, log.instructionSubType)}</span>
                                    {log.departureAirfield && (
                                        <>
                                            <span className="text-slate-300">•</span>
                                            <span className="font-mono tabular-nums uppercase inline-flex items-center gap-1">
                                                {sameAirfield ? (
                                                    <>
                                                        {log.departureAirfield}
                                                        <RotateCw className="w-3 h-3 text-slate-400" />
                                                    </>
                                                ) : (
                                                    <>
                                                        {log.departureAirfield}
                                                        <ArrowRight className="w-3 h-3 text-slate-300" />
                                                        {log.arrivalAirfield ?? "—"}
                                                    </>
                                                )}
                                            </span>
                                        </>
                                    )}
                                </div>

                                {/* Ligne 4 : hobbs + carb + anomalie */}
                                <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                                    {log.hobbsStart != null && log.hobbsEnd != null && (
                                        <span className="font-mono tabular-nums">
                                            Hobbs: <span className="text-slate-600">{log.hobbsStart.toFixed(1)} → {log.hobbsEnd.toFixed(1)}</span>
                                        </span>
                                    )}
                                    {log.fuelAdded != null && (
                                        <span className="font-mono tabular-nums">
                                            Carb: <span className="text-slate-600">{log.fuelAdded.toFixed(1)}L</span>
                                        </span>
                                    )}
                                    {hasAnomaly && (
                                        <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                                            <span className="inline-block w-2 h-2 rounded-full bg-red-500 ring-2 ring-red-100" />
                                            Anomalie
                                        </span>
                                    )}
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Dialog d'édition au clic sur une ligne */}
            <CompleteFlightDialog
                log={editingLog}
                open={editOpen}
                onOpenChange={setEditOpen}
                onCompleted={handleEditCompleted}
                defaultHobbsStart={editDefaultHobbsStart}
                defaultAirfield={defaultAirfield}
            />
        </div>
    );
};

export default AircraftLogbookTab;
