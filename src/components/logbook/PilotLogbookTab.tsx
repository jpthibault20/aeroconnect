"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { flight_logs, pilotFunction, planes, User, userRole } from "@prisma/client";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { convertMinutesToHours } from "@/api/global function/dateServeur";
import { computeFlightTimes, formatNature } from "@/lib/logbookCalc";
import RunningTotalsCard from "./RunningTotalsCard";
import SignFlightLogButton from "./SignFlightLogButton";
import LogbookFilter from "./LogbookFilter";
import CompleteFlightDialog from "./CompleteFlightDialog";
import { getPlaneHobbs } from "@/api/db/logbook";
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
import { cn } from "@/lib/utils";
import { Plane, BookOpen, ChevronLeft, ChevronRight, ArrowRight, RotateCw, ArrowUp, ArrowDown } from "lucide-react";

const PAGE_SIZE = 50;

export interface PilotExportInfo {
    logs: flight_logs[];
    pilotName: string;
    // lastName du pilote sélectionné (undefined si "Tous"), pour le nom de fichier.
    pilotLastName?: string;
    // Pour calcul de la pilotFunction effective dans le PDF (EP si user est studentID).
    // null en mode "ALL" pour un manager (on affiche la fonction stockée).
    displayedPilotID?: string | null;
}

interface Props {
    logs: flight_logs[];
    users: User[];
    planes: planes[];
    onExportInfoChange?: (info: PilotExportInfo) => void;
    onLogUpdated?: (updated: flight_logs) => void;
}

const FUNCTION_BADGE: Record<string, { label: string; className: string }> = {
    EP: { label: "EP", className: "bg-blue-100 text-blue-700 border-blue-200" },
    P: { label: "P", className: "bg-green-100 text-green-700 border-green-200" },
    I: { label: "I", className: "bg-purple-100 text-purple-700 border-purple-200" },
};

const PilotLogbookTab = ({ logs: logsProp, users, planes: planesList, onExportInfoChange, onLogUpdated }: Props) => {
    const { currentUser } = useCurrentUser();
    const { currentClub } = useCurrentClub();
    const defaultAirfield = currentClub?.id ?? undefined;
    const [selectedPilotID, setSelectedPilotID] = useState<string>("ALL");
    const [natureFilter, setNatureFilter] = useState<string | undefined>(undefined);
    const [planeFilter, setPlaneFilter] = useState<string>("ALL");
    const [onlyUnsigned, setOnlyUnsigned] = useState(false);
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    // Incrémenté à chaque "Réinitialiser filtres" pour forcer le remount du
    // LogbookFilter (uncontrolled defaultValue="ALL").
    const [filtersKey, setFiltersKey] = useState(0);

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

    // Filter logs by selected pilot — match aussi sur l'élève pour qu'un nom
    // sélectionné dans la liste retrouve les vols où la personne était élève
    // (et pas seulement pilote/instructeur).
    const pilotLogs = useMemo(() => {
        let filtered = logsProp;
        if (selectedPilotID !== "ALL") {
            filtered = filtered.filter(
                (l) => l.pilotID === selectedPilotID || l.studentID === selectedPilotID
            );
        }
        if (natureFilter) {
            filtered = filtered.filter((l) => l.flightNature === natureFilter);
        }
        if (planeFilter !== "ALL") {
            filtered = filtered.filter((l) => l.planeID === planeFilter);
        }
        if (onlyUnsigned) {
            filtered = filtered.filter((l) => !l.pilotSigned);
        }
        // Tri par date (asc/desc). On copie pour ne pas muter logsProp.
        const sorted = [...filtered].sort((a, b) => {
            const da = new Date(a.date).getTime();
            const db = new Date(b.date).getTime();
            return sortDir === "desc" ? db - da : da - db;
        });
        return sorted;
    }, [logsProp, selectedPilotID, natureFilter, planeFilter, onlyUnsigned, sortDir]);

    // Reset pagination quand les filtres ou le tri changent (anti-pattern de
    // setPage dans le useMemo précédent).
    useEffect(() => {
        setPage(0);
    }, [selectedPilotID, natureFilter, planeFilter, onlyUnsigned, sortDir]);

    // Pilote dont on regarde le carnet (pour calculer la fonction effective
    // EP/P/I de chaque ligne). En mode "ALL" pour un manager, on garde la
    // fonction stockée (vue brute). Pour un user simple, on prend currentUser.
    const displayedPilotID: string | null = useMemo(() => {
        if (selectedPilotID !== "ALL") return selectedPilotID;
        if (canSelectPilot) return null;
        return currentUser?.id ?? null;
    }, [selectedPilotID, canSelectPilot, currentUser?.id]);

    // 1 seul log par session d'instruction : si le pilote affiché est dans
    // studentID, sa fonction effective est EP (pas la fonction stockée du log,
    // qui est celle de l'instructeur).
    const effectiveFunction = useCallback(
        (log: flight_logs): pilotFunction => {
            if (displayedPilotID && log.studentID === displayedPilotID) return "EP";
            return log.pilotFunction;
        },
        [displayedPilotID]
    );

    // Pilote sélectionné pour l'export (reflète la sélection du tab).
    const exportSelectedPilot = useMemo(() => {
        if (!canSelectPilot) return currentUser ?? null;
        if (selectedPilotID === "ALL") return null;
        return users.find((u) => u.id === selectedPilotID) ?? currentUser ?? null;
    }, [canSelectPilot, selectedPilotID, users, currentUser]);

    useEffect(() => {
        const pilotName = exportSelectedPilot
            ? `${exportSelectedPilot.lastName} ${exportSelectedPilot.firstName}`
            : "Tous les pilotes / eleves";
        onExportInfoChange?.({
            logs: pilotLogs,
            pilotName,
            pilotLastName: exportSelectedPilot?.lastName,
            displayedPilotID,
        });
    }, [pilotLogs, exportSelectedPilot, displayedPilotID, onExportInfoChange]);

    const totalPages = Math.ceil(pilotLogs.length / PAGE_SIZE);
    const paginatedLogs = useMemo(
        () => pilotLogs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
        [pilotLogs, page]
    );

    const goNext = useCallback(() => setPage((p) => Math.min(p + 1, totalPages - 1)), [totalPages]);
    const goPrev = useCallback(() => setPage((p) => Math.max(p - 1, 0)), []);

    // Unique pilots + élèves from logs for dropdown
    const pilotsInLogs = useMemo(() => {
        const ids = new Set<string>();
        for (const l of logsProp) {
            ids.add(l.pilotID);
            if (l.studentID) ids.add(l.studentID);
        }
        return users.filter((u) => ids.has(u.id));
    }, [logsProp, users]);

    const handleSigned = useCallback((updated: flight_logs) => {
        onLogUpdated?.(updated);
    }, [onLogUpdated]);

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
        onLogUpdated?.(updated);
        setEditOpen(false);
        setEditingLog(null);
        setEditDefaultHobbsStart(undefined);
    }, [onLogUpdated]);

    const getCompanionName = (log: flight_logs): string => {
        const fn = effectiveFunction(log);
        if (fn === "EP" && log.instructorFirstName) {
            return `${log.instructorFirstName} ${log.instructorLastName ?? ""}`.trim();
        }
        if (fn === "EP" && log.pilotFirstName) {
            // Pas d'instructorID stocké séparément : l'instructeur EST le pilotID du log
            return `${log.pilotFirstName} ${log.pilotLastName ?? ""}`.trim();
        }
        if (fn === "I" && log.studentFirstName) {
            return `${log.studentFirstName} ${log.studentLastName ?? ""}`.trim();
        }
        return "";
    };

    return (
        <div className="flex flex-col lg:h-full gap-6">
            {/* Controls bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                {canSelectPilot && (
                    <Select
                        value={selectedPilotID}
                        onValueChange={setSelectedPilotID}
                    >
                        <SelectTrigger className="w-full sm:w-[220px] bg-white border-slate-200 focus:ring-[#774BBE]">
                            <SelectValue placeholder="Tous les pilotes / eleves" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tous les pilotes / eleves</SelectItem>
                            {pilotsInLogs.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                    {u.firstName} {u.lastName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                <Select value={planeFilter} onValueChange={setPlaneFilter}>
                    <SelectTrigger className="w-full sm:w-[200px] bg-white border-slate-200 focus:ring-[#774BBE]">
                        <SelectValue placeholder="Tous les aéronefs" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Tous les aéronefs</SelectItem>
                        {planesList.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                                {p.name} ({p.immatriculation})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <LogbookFilter key={filtersKey} onFilterChange={(f) => setNatureFilter(f.nature)} />
                {!isStudent && (
                    <div className="flex items-center gap-2 px-3 h-9 bg-white border border-slate-200 rounded-md">
                        <Switch
                            id="only-unsigned"
                            checked={onlyUnsigned}
                            onCheckedChange={setOnlyUnsigned}
                            className="data-[state=checked]:bg-[#774BBE]"
                        />
                        <Label htmlFor="only-unsigned" className="text-sm text-slate-600 cursor-pointer whitespace-nowrap">
                            À signer
                        </Label>
                    </div>
                )}
            </div>

            {/* Running totals */}
            <RunningTotalsCard logs={pilotLogs} displayedPilotID={displayedPilotID} />

            {/* Content */}
            {pilotLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                        <BookOpen className="w-8 h-8 text-[#774BBE]" />
                    </div>
                    {logsProp.length === 0 ? (
                        <>
                            <p className="text-slate-800 font-semibold mb-1">Aucun vol enregistré</p>
                            <p className="text-slate-500 text-sm max-w-sm">
                                Vos vols apparaîtront ici dès que la première session sera complétée.
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
                                    setSelectedPilotID("ALL");
                                    setNatureFilter(undefined);
                                    setPlaneFilter("ALL");
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
                                    <th className="px-2.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Aéronef</th>
                                    <th className="px-2.5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Fn</th>
                                    <th className="px-2.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Durée</th>
                                    <th className="px-2.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">DC</th>
                                    <th className="px-2.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">CdB</th>
                                    <th className="px-2.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Instr</th>
                                    <th className="px-2.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Nature</th>
                                    <th className="px-2.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Trajet</th>
                                    <th className="px-2.5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Mouv.</th>
                                    <th className="px-2.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Avec</th>
                                    {!isStudent && (
                                        <th className="px-2.5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Signé</th>
                                    )}
                                    <th className="w-6"></th>
                                </tr>
                            </thead>
                            <tbody>
                                    {paginatedLogs.map((log) => {
                                        const effFn = effectiveFunction(log);
                                        const badge = FUNCTION_BADGE[effFn] ?? FUNCTION_BADGE["P"];
                                        const times = computeFlightTimes({
                                            hobbsStart: log.hobbsStart,
                                            hobbsEnd: log.hobbsEnd,
                                            pilotFunction: effFn,
                                        });
                                        const sameAirfield = log.departureAirfield && log.arrivalAirfield && log.departureAirfield === log.arrivalAirfield;
                                        const showTrajet = log.departureAirfield || log.arrivalAirfield;
                                        return (
                                            <tr
                                                key={log.id}
                                                className={cn(
                                                    "transition-colors",
                                                    "even:bg-slate-50/40",
                                                    !isStudent && "cursor-pointer hover:bg-purple-50/40"
                                                )}
                                                onClick={isStudent ? undefined : () => handleRowClick(log)}
                                            >
                                                <td className={cn(
                                                    "pl-4 pr-2.5 py-2.5 text-[13px] text-slate-800 font-medium whitespace-nowrap border-l-4",
                                                    log.pilotSigned ? "border-l-transparent" : "border-l-amber-300"
                                                )}>
                                                    {new Date(log.date).toLocaleDateString("fr-FR")}
                                                </td>
                                                <td className="px-2.5 py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <Plane className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                                        <span className="text-[13px] font-medium text-slate-800">{log.planeName}</span>
                                                        <span className="font-mono text-[10px] tabular-nums text-slate-400">{log.planeRegistration}</span>
                                                    </div>
                                                </td>
                                                <td className="px-2.5 py-2.5 text-center">
                                                    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold border", badge.className)}>
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td className="px-2.5 py-2.5 text-right font-mono text-[12.5px] tabular-nums text-slate-800 font-medium">
                                                    {times.durationMinutes > 0 ? convertMinutesToHours(times.durationMinutes) : <span className="text-slate-300">-</span>}
                                                </td>
                                                <td className="px-2.5 py-2.5 text-right font-mono text-[12.5px] tabular-nums text-slate-600">
                                                    {times.timeDC > 0 ? convertMinutesToHours(times.timeDC) : <span className="text-slate-300">-</span>}
                                                </td>
                                                <td className="px-2.5 py-2.5 text-right font-mono text-[12.5px] tabular-nums text-slate-600">
                                                    {times.timePIC > 0 ? convertMinutesToHours(times.timePIC) : <span className="text-slate-300">-</span>}
                                                </td>
                                                <td className="px-2.5 py-2.5 text-right font-mono text-[12.5px] tabular-nums text-slate-600">
                                                    {times.timeInstructor > 0 ? convertMinutesToHours(times.timeInstructor) : <span className="text-slate-300">-</span>}
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
                                                <td className="px-2.5 py-2.5 text-center font-mono text-[12.5px] tabular-nums text-slate-600">{log.landings}</td>
                                                <td className="px-2.5 py-2.5 text-[13px] text-slate-600 max-w-[140px] truncate">
                                                    {getCompanionName(log) || <span className="text-slate-300">-</span>}
                                                </td>
                                                {!isStudent && (
                                                    <td className="px-2.5 py-2.5 text-center">
                                                        <SignFlightLogButton
                                                            log={log}
                                                            onSigned={handleSigned}
                                                            onTriggerEdit={() => handleRowClick(log)}
                                                        />
                                                    </td>
                                                )}
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
                            const effFn = effectiveFunction(log);
                            const badge = FUNCTION_BADGE[effFn] ?? FUNCTION_BADGE["P"];
                            const times = computeFlightTimes({
                                hobbsStart: log.hobbsStart,
                                hobbsEnd: log.hobbsEnd,
                                pilotFunction: effFn,
                            });
                            const sameAirfield = log.departureAirfield && log.arrivalAirfield && log.departureAirfield === log.arrivalAirfield;
                            const companion = getCompanionName(log);
                            return (
                                <div
                                    key={log.id}
                                    className={cn(
                                        "bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2.5 border-l-4",
                                        log.pilotSigned ? "border-l-slate-200" : "border-l-amber-300",
                                        !isStudent && "cursor-pointer active:bg-slate-50"
                                    )}
                                    onClick={isStudent ? undefined : () => handleRowClick(log)}
                                >
                                    {/* Ligne 1 : date + statut signé */}
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-semibold text-slate-800">
                                            {new Date(log.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                                        </span>
                                        {!isStudent && (
                                            <SignFlightLogButton
                                                log={log}
                                                onSigned={handleSigned}
                                                onTriggerEdit={() => handleRowClick(log)}
                                            />
                                        )}
                                    </div>

                                    {/* Ligne 2 : avion + badge fonction + durée */}
                                    <div className="flex items-center gap-2">
                                        <Plane className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                        <span className="text-sm font-medium text-slate-800 truncate">{log.planeName}</span>
                                        <span className="font-mono text-[10px] tabular-nums text-slate-400">{log.planeRegistration}</span>
                                        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold border", badge.className)}>
                                            {badge.label}
                                        </span>
                                        <span className="ml-auto font-mono text-[13px] tabular-nums font-semibold text-slate-800">
                                            {times.durationMinutes > 0 ? convertMinutesToHours(times.durationMinutes) : <span className="text-slate-300">--:--</span>}
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

                                    {/* Ligne 4 : compagnon (conditionnelle) */}
                                    {companion && (
                                        <div className="text-xs text-slate-400">
                                            Avec : <span className="text-slate-600">{companion}</span>
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
