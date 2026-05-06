"use client";

import React, { useState, useMemo, useCallback } from "react";
import { flight_logs, User, userRole } from "@prisma/client";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { convertMinutesToHours } from "@/api/global function/dateServeur";
import RunningTotalsCard from "./RunningTotalsCard";
import SignFlightLogButton from "./SignFlightLogButton";
import LogbookFilter from "./LogbookFilter";
import CompleteFlightDialog from "./CompleteFlightDialog";
import { getPlaneHobbs } from "@/api/db/logbook";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Plane, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 50;

interface Props {
    logs: flight_logs[];
    users: User[];
}

const NATURE_LABELS: Record<string, string> = {
    INSTRUCTION: "Instruction",
    LOCAL: "Local",
    NAVIGATION: "Navigation",
    VLO: "VLO",
    VLD: "VLD",
    EXAM: "Examen",
    FIRST_FLIGHT: "1er vol",
    BAPTEME: "Bapteme",
    OTHER: "Autre",
};

const FUNCTION_BADGE: Record<string, { label: string; className: string }> = {
    EP: { label: "EP", className: "bg-blue-100 text-blue-700 border-blue-200" },
    P: { label: "P", className: "bg-green-100 text-green-700 border-green-200" },
    I: { label: "I", className: "bg-purple-100 text-purple-700 border-purple-200" },
};

const PilotLogbookTab = ({ logs: logsProp, users }: Props) => {
    const { currentUser } = useCurrentUser();
    const { currentClub } = useCurrentClub();
    const defaultAirfield = currentClub?.defaultAirfield ?? currentClub?.id ?? undefined;
    const [selectedPilotID, setSelectedPilotID] = useState<string>("ALL");
    const [natureFilter, setNatureFilter] = useState<string | undefined>(undefined);

    const [page, setPage] = useState(0);
    const [editingLog, setEditingLog] = useState<flight_logs | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editDefaultHobbsStart, setEditDefaultHobbsStart] = useState<number | undefined>(undefined);

    const canSelectPilot =
        currentUser?.role === userRole.ADMIN ||
        currentUser?.role === userRole.OWNER ||
        currentUser?.role === userRole.MANAGER ||
        currentUser?.role === userRole.INSTRUCTOR;

    // Élève : page d'information uniquement. Pas d'édition, pas de bouton de
    // signature, pas de colonne "signé".
    const isStudent = currentUser?.role === userRole.STUDENT;

    // Filter logs by selected pilot
    const pilotLogs = useMemo(() => {
        let filtered = logsProp;
        if (selectedPilotID !== "ALL") {
            filtered = filtered.filter((l) => l.pilotID === selectedPilotID);
        }
        if (natureFilter) {
            filtered = filtered.filter((l) => l.flightNature === natureFilter);
        }
        setPage(0);
        return filtered;
    }, [logsProp, selectedPilotID, natureFilter]);

    const totalPages = Math.ceil(pilotLogs.length / PAGE_SIZE);
    const paginatedLogs = useMemo(
        () => pilotLogs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
        [pilotLogs, page]
    );

    const goNext = useCallback(() => setPage((p) => Math.min(p + 1, totalPages - 1)), [totalPages]);
    const goPrev = useCallback(() => setPage((p) => Math.max(p - 1, 0)), []);

    // Unique pilots from logs for dropdown
    const pilotsInLogs = useMemo(() => {
        const ids = new Set(logsProp.map((l) => l.pilotID));
        return users.filter((u) => ids.has(u.id));
    }, [logsProp, users]);

    const handleSigned = () => {};

    const handleRowClick = useCallback(async (log: flight_logs) => {
        // Lecture seule pour les élèves : ne pas ouvrir le dialog d'édition.
        if (isStudent) return;

        setEditingLog(log);
        setEditDefaultHobbsStart(undefined);
        setEditOpen(true);

        // Pré-remplir l'heure moteur de début avec le hobbsTotal courant de
        // l'avion (cohérent avec la popup auto via PendingFlightsPrompt).
        if (log.planeID && log.hobbsStart == null) {
            const hobbs = await getPlaneHobbs(log.planeID);
            if (hobbs != null) setEditDefaultHobbsStart(hobbs);
        }
    }, [isStudent]);

    const handleEditCompleted = useCallback((updated: flight_logs) => {
        // Met à jour la liste locale avec les nouvelles données
        // Le parent (LogbookPageComponent) devra être refreshé pour voir les changements persistés
        setEditOpen(false);
        setEditingLog(null);
        setEditDefaultHobbsStart(undefined);
    }, []);

    const getCompanionName = (log: flight_logs): string => {
        if (log.pilotFunction === "EP" && log.instructorFirstName) {
            return `${log.instructorFirstName} ${log.instructorLastName ?? ""}`.trim();
        }
        if (log.pilotFunction === "I" && log.studentFirstName) {
            return `${log.studentFirstName} ${log.studentLastName ?? ""}`.trim();
        }
        return "";
    };

    return (
        <div className="flex flex-col h-full gap-6">
            {/* Controls bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {canSelectPilot && (
                    <Select
                        value={selectedPilotID}
                        onValueChange={setSelectedPilotID}
                    >
                        <SelectTrigger className="w-full sm:w-[220px] bg-white border-slate-200 focus:ring-[#774BBE]">
                            <SelectValue placeholder="Tous les pilotes" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tous les pilotes</SelectItem>
                            {pilotsInLogs.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                    {u.firstName} {u.lastName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                <LogbookFilter onFilterChange={(f) => setNatureFilter(f.nature)} />
            </div>

            {/* Running totals */}
            <RunningTotalsCard logs={pilotLogs} />

            {/* Content */}
            {pilotLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
                    <BookOpen className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="text-slate-500 font-medium">Aucune entree dans le carnet de vol.</p>
                </div>
            ) : (
                <>
                    {/* Desktop table */}
                    <div className="hidden lg:flex lg:flex-col flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-slate-50">
                                <tr className="border-b border-slate-100">
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Aeronef</th>
                                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Fonction</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nature</th>
                                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Duree</th>
                                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">DC</th>
                                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">CdB</th>
                                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Instr</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Depart</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Arrivee</th>
                                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Dec.</th>
                                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Att.</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Avec</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Remarques</th>
                                    {!isStudent && (
                                        <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Signe</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                    {paginatedLogs.map((log) => {
                                        const badge = FUNCTION_BADGE[log.pilotFunction] ?? FUNCTION_BADGE["P"];
                                        return (
                                            <tr
                                                key={log.id}
                                                className={cn(
                                                    "hover:bg-slate-50/50 transition-colors",
                                                    !isStudent && "cursor-pointer"
                                                )}
                                                onClick={isStudent ? undefined : () => handleRowClick(log)}
                                            >
                                                <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                                                    {new Date(log.date).toLocaleDateString("fr-FR")}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Plane className="w-3.5 h-3.5 text-slate-400" />
                                                        <span className="font-medium text-slate-700">{log.planeName}</span>
                                                        <span className="font-mono text-[10px] text-slate-400">{log.planeRegistration}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border", badge.className)}>
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                                                    {NATURE_LABELS[log.flightNature] ?? log.flightNature}
                                                </td>
                                                <td className="px-3 py-3 text-right font-mono text-slate-700">
                                                    {convertMinutesToHours(log.durationMinutes)}
                                                </td>
                                                <td className="px-3 py-3 text-right font-mono text-slate-500">
                                                    {log.timeDC > 0 ? convertMinutesToHours(log.timeDC) : "-"}
                                                </td>
                                                <td className="px-3 py-3 text-right font-mono text-slate-500">
                                                    {log.timePIC > 0 ? convertMinutesToHours(log.timePIC) : "-"}
                                                </td>
                                                <td className="px-3 py-3 text-right font-mono text-slate-500">
                                                    {log.timeInstructor > 0 ? convertMinutesToHours(log.timeInstructor) : "-"}
                                                </td>
                                                <td className="px-3 py-3 font-mono text-xs text-slate-600 uppercase">
                                                    {log.departureAirfield ?? "-"}
                                                </td>
                                                <td className="px-3 py-3 font-mono text-xs text-slate-600 uppercase">
                                                    {log.arrivalAirfield ?? "-"}
                                                </td>
                                                <td className="px-3 py-3 text-center text-slate-600">{log.takeoffs}</td>
                                                <td className="px-3 py-3 text-center text-slate-600">{log.landings}</td>
                                                <td className="px-3 py-3 text-slate-600 text-xs max-w-[120px] truncate">
                                                    {getCompanionName(log) || "-"}
                                                </td>
                                                <td className="px-3 py-3 text-slate-500 text-xs max-w-[100px] truncate">
                                                    {log.remarks ?? "-"}
                                                </td>
                                                {!isStudent && (
                                                    <td className="px-3 py-3 text-center">
                                                        <SignFlightLogButton
                                                            log={log}
                                                            onSigned={handleSigned}
                                                        />
                                                    </td>
                                                )}
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
                                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, pilotLogs.length)} sur {pilotLogs.length}
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
                            const badge = FUNCTION_BADGE[log.pilotFunction] ?? FUNCTION_BADGE["P"];
                            return (
                                <div
                                    key={log.id}
                                    className={cn(
                                        "bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3",
                                        !isStudent && "cursor-pointer active:bg-slate-50"
                                    )}
                                    onClick={isStudent ? undefined : () => handleRowClick(log)}
                                >
                                    {/* Top row: date + signed */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-700">
                                            {new Date(log.date).toLocaleDateString("fr-FR")}
                                        </span>
                                        {!isStudent && (
                                            <SignFlightLogButton
                                                log={log}
                                                onSigned={handleSigned}
                                            />
                                        )}
                                    </div>

                                    {/* Aircraft + function */}
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-purple-50 rounded-lg">
                                            <Plane className="w-4 h-4 text-[#774BBE]" />
                                        </div>
                                        <span className="font-semibold text-slate-800">{log.planeName}</span>
                                        <span className="font-mono text-[10px] text-slate-400">{log.planeRegistration}</span>
                                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ml-auto", badge.className)}>
                                            {badge.label}
                                        </span>
                                    </div>

                                    {/* Stats row */}
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span className="font-mono font-medium text-slate-700">
                                            {convertMinutesToHours(log.durationMinutes)}
                                        </span>
                                        <span>{NATURE_LABELS[log.flightNature] ?? log.flightNature}</span>
                                        {log.departureAirfield && (
                                            <span className="font-mono uppercase">
                                                {log.departureAirfield}
                                                {log.arrivalAirfield && log.arrivalAirfield !== log.departureAirfield
                                                    ? ` → ${log.arrivalAirfield}`
                                                    : ""}
                                            </span>
                                        )}
                                    </div>

                                    {/* Companion */}
                                    {getCompanionName(log) && (
                                        <div className="text-xs text-slate-400">
                                            Avec : <span className="text-slate-600">{getCompanionName(log)}</span>
                                        </div>
                                    )}
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

export default PilotLogbookTab;
