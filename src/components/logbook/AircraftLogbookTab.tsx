"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { flight_logs, planes } from "@prisma/client";
import { convertMinutesToHours } from "@/api/global function/dateServeur";
import { computeFlightTimes, formatNature } from "@/lib/logbookCalc";
import SignFlightLogButton from "./SignFlightLogButton";
import LogbookFilter from "./LogbookFilter";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plane, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 50;

interface Props {
    logs: flight_logs[];
    planes: planes[];
    onPlaneChange?: (planeID: string) => void;
    onFilteredLogsChange?: (logs: flight_logs[]) => void;
    onLogUpdated?: (updated: flight_logs) => void;
}

const AircraftLogbookTab = ({ logs: logsProp, planes: planesList, onPlaneChange, onFilteredLogsChange, onLogUpdated }: Props) => {
    const [selectedPlaneID, setSelectedPlaneID] = useState<string>(
        planesList.length > 0 ? planesList[0].id : "NONE"
    );

    useEffect(() => {
        onPlaneChange?.(selectedPlaneID);
    }, [selectedPlaneID, onPlaneChange]);

    const [natureFilter, setNatureFilter] = useState<string | undefined>(undefined);
    const [page, setPage] = useState(0);

    const planeLogs = useMemo(() => {
        let filtered = logsProp;
        if (selectedPlaneID !== "ALL") {
            filtered = filtered.filter((l) => l.planeID === selectedPlaneID);
        }
        if (natureFilter) {
            filtered = filtered.filter((l) => l.flightNature === natureFilter);
        }
        setPage(0);
        return filtered;
    }, [logsProp, selectedPlaneID, natureFilter]);

    useEffect(() => {
        onFilteredLogsChange?.(planeLogs);
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

    return (
        <div className="flex flex-col lg:h-full gap-6">
            {/* Controls bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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

                <LogbookFilter onFilterChange={(f) => setNatureFilter(f.nature)} />
            </div>

            {/* Content */}
            {planeLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
                    <Plane className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="text-slate-500 font-medium">Aucune entree dans le carnet de vol machine.</p>
                </div>
            ) : (
                <>
                    {/* Desktop table */}
                    <div className="hidden lg:flex lg:flex-col flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-slate-50">
                                <tr className="border-b border-slate-100">
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Pilote</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Depart</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Arrivee</th>
                                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Temps</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nature</th>
                                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Hobbs deb.</th>
                                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Hobbs fin</th>
                                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Att.</th>
                                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Carburant</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Anomalie machine</th>
                                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Signé</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                    {paginatedLogs.map((log) => {
                                        const times = computeFlightTimes(log);
                                        return (
                                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-3 py-3 text-slate-700 whitespace-nowrap font-medium">
                                                {log.pilotFirstName} {log.pilotLastName}
                                            </td>
                                            <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                                                {new Date(log.date).toLocaleDateString("fr-FR")}
                                            </td>
                                            <td className="px-3 py-3 font-mono text-xs text-slate-600 uppercase">
                                                {log.departureAirfield ?? "-"}
                                            </td>
                                            <td className="px-3 py-3 font-mono text-xs text-slate-600 uppercase">
                                                {log.arrivalAirfield ?? "-"}
                                            </td>
                                            <td className="px-3 py-3 text-right font-mono text-slate-700">
                                                {times.durationMinutes > 0 ? convertMinutesToHours(times.durationMinutes) : "-"}
                                            </td>
                                            <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                                                {formatNature(log.flightNature, log.instructionSubType)}
                                            </td>
                                            <td className="px-3 py-3 text-right font-mono text-slate-500">
                                                {log.hobbsStart != null ? log.hobbsStart.toFixed(1) : "-"}
                                            </td>
                                            <td className="px-3 py-3 text-right font-mono text-slate-500">
                                                {log.hobbsEnd != null ? log.hobbsEnd.toFixed(1) : "-"}
                                            </td>
                                            <td className="px-3 py-3 text-center text-slate-600">{log.landings}</td>
                                            <td className="px-3 py-3 text-right font-mono text-slate-500">
                                                {log.fuelAdded != null ? `${log.fuelAdded.toFixed(1)}L` : "-"}
                                            </td>
                                            <td className="px-3 py-3 text-slate-500 text-xs max-w-[120px] truncate">
                                                {log.machineAnomalies ?? "RAS"}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <SignFlightLogButton log={log} onSigned={handleSigned} />
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
                            const times = computeFlightTimes(log);
                            return (
                            <div
                                key={log.id}
                                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3"
                            >
                                {/* Top row */}
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-slate-800">
                                        {log.pilotFirstName} {log.pilotLastName}
                                    </span>
                                    <SignFlightLogButton log={log} onSigned={handleSigned} />
                                </div>

                                {/* Date + nature */}
                                <div className="flex items-center gap-3 text-sm text-slate-500">
                                    <span>{new Date(log.date).toLocaleDateString("fr-FR")}</span>
                                    <span className="text-slate-300">|</span>
                                    <span>{formatNature(log.flightNature, log.instructionSubType)}</span>
                                    {times.durationMinutes > 0 && (
                                        <span className="ml-auto font-mono font-medium text-slate-700">
                                            {convertMinutesToHours(times.durationMinutes)}
                                        </span>
                                    )}
                                </div>

                                {/* Route */}
                                {(log.departureAirfield || log.arrivalAirfield) && (
                                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500 uppercase">
                                        <span>{log.departureAirfield ?? "?"}</span>
                                        <span className="text-slate-300">&rarr;</span>
                                        <span>{log.arrivalAirfield ?? "?"}</span>
                                    </div>
                                )}

                                {/* Machine stats */}
                                <div className="flex items-center gap-4 text-xs text-slate-400">
                                    {log.hobbsStart != null && (
                                        <span>Hobbs: {log.hobbsStart.toFixed(1)} → {log.hobbsEnd?.toFixed(1) ?? "?"}</span>
                                    )}
                                    {log.fuelAdded != null && <span>Carb: {log.fuelAdded.toFixed(1)}L</span>}
                                    {log.machineAnomalies && log.machineAnomalies !== "RAS" && (
                                        <span className="text-amber-600 font-medium">Anomalie</span>
                                    )}
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default AircraftLogbookTab;
