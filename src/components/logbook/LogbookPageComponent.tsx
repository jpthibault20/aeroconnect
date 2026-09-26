"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { flight_logs, planes, User, userRole } from "@prisma/client";
import type { DateRange } from "react-day-picker";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import PilotLogbookTab, { PilotExportInfo } from "./PilotLogbookTab";
import AircraftLogbookTab from "./AircraftLogbookTab";
import NewFlightLogDialog from "./NewFlightLogDialog";
import LogbookDateRangePicker from "./LogbookDateRangePicker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookOpen, Plane, FileDown } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { PilotLogbookDocument } from "@/components/pdf/exportPilotLogbook";
import { AircraftLogbookDocument } from "@/components/pdf/exportAircraftLogbook";
import { mergeSessionLogs } from "./mergeSessionLogs";
import { canAddManualLogEntry, canSeeAircraftLogbook, isLogbookReadOnly } from "@/lib/logbookPermissions";
import { groupLogsByMachine, canExportAircraftLogbook } from "@/lib/logbookDisplay";
import { getClubFlightLogsByDateRange } from "@/api/db/logbook";

const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const fmtDate = (d: Date) => d.toLocaleDateString("fr-FR");

interface Props {
    logsProp: flight_logs[];
    planesProp: planes[];
    usersProp: User[];
}

type Tab = "pilot" | "aircraft";

const LogbookPageComponent = ({ logsProp, planesProp, usersProp }: Props) => {
    const { currentUser } = useCurrentUser();
    const [logs, setLogs] = useState<flight_logs[]>(logsProp);
    const [activeTab, setActiveTab] = useState<Tab>("pilot");

    // Default range = current calendar year, the one ServerPageComp already loaded
    // server-side (logsProp). While the user stays on that range, logsProp is just
    // mirrored (no extra network round trip).
    const defaultRange = useMemo<DateRange>(() => {
        const year = new Date().getFullYear();
        return { from: new Date(year, 0, 1), to: new Date(year, 11, 31) };
    }, []);
    const [dateRange, setDateRange] = useState<DateRange>(defaultRange);
    const [rangeLoading, setRangeLoading] = useState(false);

    const isDefaultRange = useCallback((r: DateRange) => {
        if (!r.from || !r.to || !defaultRange.from || !defaultRange.to) return false;
        return isSameDay(r.from, defaultRange.from) && isSameDay(r.to, defaultRange.to);
    }, [defaultRange]);

    const fetchLogsForRange = useCallback(async (range: DateRange) => {
        if (!currentUser?.clubID || !range.from || !range.to) return;
        setRangeLoading(true);
        const res = await getClubFlightLogsByDateRange(currentUser.clubID, range.from, range.to);
        if ("logs" in res) setLogs(res.logs);
        setRangeLoading(false);
    }, [currentUser?.clubID]);

    const didMountRef = useRef(false);
    // Resync local state with server data on every new RSC render (revalidatePath
    // after a mutation). Otherwise useState stays frozen on the first render and
    // changes only show after a manual reload. logsProp only changes reference when
    // the server sends new data, so this effect does not fire on plain client
    // re-renders (filters, pagination…). Optimistic updates (onCreated/onDeleted/…)
    // stay valid: the following server refresh carries the same data.
    // ServerPageComp always loads the current year only: if a custom range is active,
    // the query is replayed for THAT range instead of adopting logsProp, otherwise
    // the view would silently revert to the current year after any mutation elsewhere
    // in the app.
    useEffect(() => {
        if (!didMountRef.current) {
            didMountRef.current = true;
            setLogs(logsProp);
            return;
        }
        if (isDefaultRange(dateRange)) {
            setLogs(logsProp);
        } else {
            void fetchLogsForRange(dateRange);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [logsProp]);

    const handleDateRangeChange = useCallback((range: DateRange) => {
        setDateRange(range);
        void fetchLogsForRange(range);
    }, [fetchLogsForRange]);

    const periodLabel = useMemo(() => {
        if (!dateRange.from || !dateRange.to) return "";
        if (isDefaultRange(dateRange)) return String(dateRange.from.getFullYear());
        return `${fmtDate(dateRange.from)} – ${fmtDate(dateRange.to)}`;
    }, [dateRange, isDefaultRange]);

    // Manual entry: management roles + PILOT (for their own logbook). Not STUDENT
    // (they fly with an instructor, their flights are auto-logged).
    const canAddManualEntry = canAddManualLogEntry(currentUser?.role);

    // A member owning a private plane can view THEIR plane's logbook (read-only if
    // they are not management).
    const ownsPrivatePlane =
        !!currentUser && planesProp.some((p) => p.ownerID === currentUser.id);
    const canSeeAircraftTab = canSeeAircraftLogbook(currentUser?.role, { ownsPrivatePlane });
    const aircraftReadOnly = isLogbookReadOnly(currentUser?.role);
    // Planes offered in the plane logbook: management sees the whole visible fleet; a
    // non-management member ONLY sees their planes.
    const aircraftPlanes = aircraftReadOnly && currentUser
        ? planesProp.filter((p) => p.ownerID === currentUser.id)
        : planesProp;

    // Filter logs based on role. With 1 log per instruction session
    // (pilotID=instructor + studentID=student), a regular user must see the logs
    // where they are the pilot OR the student.
    const visibleLogs = useMemo(() => {
        if (!currentUser) return [];
        let filtered: flight_logs[];
        if (
            currentUser.role === userRole.STUDENT ||
            currentUser.role === userRole.PILOT ||
            currentUser.role === userRole.INSTRUCTOR
        ) {
            // Personal logbook: flights where they are the pilot (instructor or CDB) or the
            // student (studentID).
            filtered = logs.filter(
                (l) => l.pilotID === currentUser.id || l.studentID === currentUser.id
            );
        } else {
            // ADMIN / OWNER / MANAGER: the whole club
            filtered = logs;
        }
        // mergeSessionLogs is nearly a no-op with 1 log per session, but stays useful if
        // the DB still holds old paired logs.
        return mergeSessionLogs(filtered);
    }, [logs, currentUser]);

    const [selectedPlaneForExport, setSelectedPlaneForExport] = useState<string>("");
    const [exporting, setExporting] = useState(false);

    // Export data reported by each tab (= what the user sees, filters applied), so
    // the current view is exported exactly.
    const [pilotExportInfo, setPilotExportInfo] = useState<PilotExportInfo>({
        logs: [],
        pilotName: "",
    });
    const [aircraftExportLogs, setAircraftExportLogs] = useState<flight_logs[]>([]);

    const handlePilotExportInfoChange = useCallback((info: PilotExportInfo) => {
        setPilotExportInfo(info);
    }, []);
    const handleAircraftFilteredLogsChange = useCallback((logs: flight_logs[]) => {
        setAircraftExportLogs(logs);
    }, []);

    const handleCreated = (log: flight_logs) => {
        setLogs((prev) => [...prev, log]);
    };

    const handleLogUpdated = useCallback((updated: flight_logs) => {
        setLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    }, []);

    const handleLogDeleted = useCallback((deleted: flight_logs) => {
        setLogs((prev) => prev.filter((l) => l.id !== deleted.id));
    }, []);

    const handleExportPDF = useCallback(async () => {
        if (!currentUser) return;
        setExporting(true);
        try {
            let blob: Blob;
            const now = new Date();
            const datestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
            // Sanitize: strip accents and replace any non-alphanumeric character with "_".
            const safe = (s: string) =>
                s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]/g, "_");
            let filename: string;

            if (activeTab === "pilot") {
                const { logs: pilotLogs, pilotName, pilotLastName, displayedPilotID } = pilotExportInfo;
                blob = await pdf(
                    <PilotLogbookDocument
                        logs={pilotLogs}
                        pilotName={pilotName}
                        periodLabel={periodLabel}
                        displayedPilotID={displayedPilotID}
                    />
                ).toBlob();
                filename = pilotLastName
                    ? `carnet_de_vol_pilote_${safe(pilotLastName)}_${datestamp}.pdf`
                    : `carnet_de_vol_pilote_${datestamp}.pdf`;
            } else {
                // Plane logbook. A specific plane => one section; "All planes" => one section per
                // plane (grouped from the log's denormalized fields, robust to deletions).
                if (selectedPlaneForExport && selectedPlaneForExport !== "ALL") {
                    const plane = planesProp.find((p) => p.id === selectedPlaneForExport);
                    const registration = plane?.immatriculation ?? aircraftExportLogs[0]?.planeRegistration ?? "";
                    blob = await pdf(
                        <AircraftLogbookDocument
                            sections={[{
                                planeRegistration: registration,
                                planeName: plane?.name ?? aircraftExportLogs[0]?.planeName ?? "",
                                logs: aircraftExportLogs,
                            }]}
                            periodLabel={periodLabel}
                        />
                    ).toBlob();
                    filename = registration
                        ? `carnet_de_vol_machine_${safe(registration)}_${datestamp}.pdf`
                        : `carnet_de_vol_machine_${datestamp}.pdf`;
                } else {
                    // "All planes": one PDF section per plane.
                    const sections = groupLogsByMachine(aircraftExportLogs);
                    blob = await pdf(
                        <AircraftLogbookDocument sections={sections} periodLabel={periodLabel} />
                    ).toBlob();
                    filename = `carnet_de_vol_machines_${datestamp}.pdf`;
                }
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch {
            // silent fail
        } finally {
            setExporting(false);
        }
    }, [activeTab, currentUser, periodLabel, planesProp, selectedPlaneForExport, pilotExportInfo, aircraftExportLogs]);

    return (
        <div className="h-full flex flex-col bg-slate-50 p-4 sm:p-6 md:p-8 font-sans text-slate-800 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center space-x-3">
                    <h1 className="font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight">
                        Carnet de vol
                    </h1>
                    <span className="px-3 py-1 bg-white text-purple-600 border border-purple-100 font-semibold rounded-full text-sm shadow-sm">
                        {rangeLoading ? "Chargement…" : `${visibleLogs.length} entrees`}
                    </span>
                </div>

                {/* Action bar: full width on mobile. The period selector keeps its content width (mr-auto pushes the buttons right) and only shrinks when needed; the buttons keep their size so they are never clipped. */}
                <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto min-w-0">
                    {/* Date range selector: also drives the period exported to PDF */}
                    <LogbookDateRangePicker
                        value={dateRange}
                        onChange={handleDateRangeChange}
                        disabled={rangeLoading}
                        className="min-w-0 mr-auto md:mr-0"
                    />

                    {/* Export PDF */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 text-slate-600 hover:bg-slate-100 flex-shrink-0 px-2.5 sm:px-3"
                        disabled={exporting || rangeLoading || (activeTab === "aircraft" && !canExportAircraftLogbook(aircraftExportLogs))}
                        onClick={handleExportPDF}
                    >
                        <FileDown className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">{exporting ? "Export..." : "Export PDF"}</span>
                    </Button>

                    <div className="hidden sm:block h-6 w-[1px] bg-slate-200 mx-1 flex-shrink-0" />

                    {/* New entry button */}
                    {canAddManualEntry && (
                        <NewFlightLogDialog
                            planes={planesProp}
                            users={usersProp}
                            onCreated={handleCreated}
                        />
                    )}
                </div>
            </div>

            {/* Tabs */}
            {canSeeAircraftTab && (
                <div className="flex items-center gap-0 mb-6 border-b border-slate-200 overflow-x-auto scrollbar-hide">
                    <button
                        onClick={() => setActiveTab("pilot")}
                        className={cn(
                            "flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap flex-shrink-0",
                            activeTab === "pilot"
                                ? "border-[#774BBE] text-[#774BBE]"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <BookOpen className="w-4 h-4" />
                        Carnet de Vol Pilote
                    </button>
                    <button
                        onClick={() => setActiveTab("aircraft")}
                        className={cn(
                            "flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap flex-shrink-0",
                            activeTab === "aircraft"
                                ? "border-[#774BBE] text-[#774BBE]"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Plane className="w-4 h-4" />
                        Carnet de Vol Machine
                    </button>
                </div>
            )}

            {/* Tab content */}
            <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
                {activeTab === "pilot" && (
                    <PilotLogbookTab
                        logs={visibleLogs}
                        users={usersProp}
                        planes={planesProp}
                        onExportInfoChange={handlePilotExportInfoChange}
                        onLogUpdated={handleLogUpdated}
                        onLogDeleted={handleLogDeleted}
                    />
                )}
                {activeTab === "aircraft" && canSeeAircraftTab && (
                    <AircraftLogbookTab
                        logs={visibleLogs}
                        planes={aircraftPlanes}
                        readOnly={aircraftReadOnly}
                        onPlaneChange={setSelectedPlaneForExport}
                        onFilteredLogsChange={handleAircraftFilteredLogsChange}
                        onLogUpdated={handleLogUpdated}
                        onLogDeleted={handleLogDeleted}
                    />
                )}
            </div>
        </div>
    );
};

export default LogbookPageComponent;
