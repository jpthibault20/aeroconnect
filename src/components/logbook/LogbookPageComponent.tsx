"use client";

import React, { useState, useMemo, useCallback } from "react";
import { flight_logs, planes, User, userRole } from "@prisma/client";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import PilotLogbookTab, { PilotExportInfo } from "./PilotLogbookTab";
import AircraftLogbookTab from "./AircraftLogbookTab";
import NewFlightLogDialog from "./NewFlightLogDialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { BookOpen, Plane, FileDown } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { PilotLogbookDocument } from "@/components/pdf/exportPilotLogbook";
import { AircraftLogbookDocument } from "@/components/pdf/exportAircraftLogbook";
import { mergeSessionLogs } from "./mergeSessionLogs";

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
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const canManage =
        currentUser?.role === userRole.ADMIN ||
        currentUser?.role === userRole.OWNER ||
        currentUser?.role === userRole.MANAGER ||
        currentUser?.role === userRole.INSTRUCTOR;

    const canSeeAircraftTab =
        currentUser?.role === userRole.ADMIN ||
        currentUser?.role === userRole.OWNER ||
        currentUser?.role === userRole.MANAGER ||
        currentUser?.role === userRole.INSTRUCTOR;

    // Filter logs based on role. Avec la nouvelle logique (1 log par session
    // d'instruction, pilotID=instructeur + studentID=élève), un user simple
    // doit voir les logs où il est pilote OU élève.
    const visibleLogs = useMemo(() => {
        if (!currentUser) return [];
        let filtered: flight_logs[];
        if (
            currentUser.role === userRole.STUDENT ||
            currentUser.role === userRole.PILOT ||
            currentUser.role === userRole.INSTRUCTOR
        ) {
            // Carnet personnel : vols où il est pilote (instructeur ou CDB)
            // ou élève (studentID).
            filtered = logs.filter(
                (l) => l.pilotID === currentUser.id || l.studentID === currentUser.id
            );
        } else {
            // ADMIN / OWNER / MANAGER : tout le club
            filtered = logs;
        }
        // mergeSessionLogs est devenu quasi no-op avec la nouvelle logique
        // (1 log par session) mais reste utile si la DB contient encore des
        // anciens logs paires en cohabitation.
        return mergeSessionLogs(filtered);
    }, [logs, currentUser]);

    // Build year options from logs
    const yearOptions = useMemo(() => {
        const years = new Set(logs.map((l) => new Date(l.date).getFullYear()));
        years.add(new Date().getFullYear());
        return Array.from(years).sort((a, b) => b - a);
    }, [logs]);

    const [selectedPlaneForExport, setSelectedPlaneForExport] = useState<string>("");
    const [exporting, setExporting] = useState(false);

    // Données d'export remontées par chaque tab (= ce que voit l'utilisateur,
    // filtres appliqués). Permet d'exporter exactement la vue courante.
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

    const handleExportPDF = useCallback(async () => {
        if (!currentUser) return;
        setExporting(true);
        try {
            let blob: Blob;
            const now = new Date();
            const datestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
            // Sanitize : retire accents et remplace tout caractère non alphanum par "_".
            const safe = (s: string) =>
                s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]/g, "_");
            let filename: string;

            if (activeTab === "pilot") {
                const { logs: pilotLogs, pilotName, pilotLastName, displayedPilotID } = pilotExportInfo;
                blob = await pdf(
                    <PilotLogbookDocument
                        logs={pilotLogs}
                        pilotName={pilotName}
                        year={selectedYear}
                        displayedPilotID={displayedPilotID}
                    />
                ).toBlob();
                filename = pilotLastName
                    ? `carnet_de_vol_pilote_${safe(pilotLastName)}_${datestamp}.pdf`
                    : `carnet_de_vol_pilote_${datestamp}.pdf`;
            } else {
                const plane = planesProp.find((p) => p.id === selectedPlaneForExport);
                blob = await pdf(
                    <AircraftLogbookDocument
                        logs={aircraftExportLogs}
                        planeRegistration={plane?.immatriculation ?? ""}
                        planeName={plane?.name ?? ""}
                        year={selectedYear}
                    />
                ).toBlob();
                filename = plane
                    ? `carnet_de_vol_machine_${safe(plane.immatriculation)}_${datestamp}.pdf`
                    : `carnet_de_vol_machine_${datestamp}.pdf`;
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
    }, [activeTab, currentUser, selectedYear, planesProp, selectedPlaneForExport, pilotExportInfo, aircraftExportLogs]);

    return (
        <div className="h-full flex flex-col bg-slate-50 p-6 md:p-8 font-sans text-slate-800 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center space-x-3">
                    <h1 className="font-bold text-3xl text-slate-900 tracking-tight">
                        Carnet de vol
                    </h1>
                    <span className="px-3 py-1 bg-white text-purple-600 border border-purple-100 font-semibold rounded-full text-sm shadow-sm">
                        {visibleLogs.length} entrees
                    </span>
                </div>

                {/* Action bar */}
                <div className="flex items-center gap-3">
                    {/* Year selector */}
                    <Select
                        value={String(selectedYear)}
                        onValueChange={(val) => setSelectedYear(parseInt(val))}
                    >
                        <SelectTrigger className="w-[100px] bg-white border-slate-200 focus:ring-[#774BBE] text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {yearOptions.map((y) => (
                                <SelectItem key={y} value={String(y)}>
                                    {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Export PDF */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 text-slate-600 hover:bg-slate-100"
                        disabled={exporting || (activeTab === "aircraft" && !selectedPlaneForExport)}
                        onClick={handleExportPDF}
                    >
                        <FileDown className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">{exporting ? "Export..." : "Export PDF"}</span>
                    </Button>

                    <div className="h-6 w-[1px] bg-slate-200 mx-1" />

                    {/* New entry button */}
                    {canManage && (
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
                <div className="flex items-center gap-0 mb-6 border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab("pilot")}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px]",
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
                            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px]",
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
                        onExportInfoChange={handlePilotExportInfoChange}
                    />
                )}
                {activeTab === "aircraft" && canSeeAircraftTab && (
                    <AircraftLogbookTab
                        logs={visibleLogs}
                        planes={planesProp}
                        onPlaneChange={setSelectedPlaneForExport}
                        onFilteredLogsChange={handleAircraftFilteredLogsChange}
                    />
                )}
            </div>
        </div>
    );
};

export default LogbookPageComponent;
