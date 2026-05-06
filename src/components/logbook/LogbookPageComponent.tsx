"use client";

import React, { useState, useMemo, useCallback } from "react";
import { flight_logs, planes, User, userRole } from "@prisma/client";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import PilotLogbookTab from "./PilotLogbookTab";
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
import { dedupAircraftLogs } from "./dedupAircraftLogs";

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

    // Filter logs based on role
    const visibleLogs = useMemo(() => {
        if (!currentUser) return [];
        if (
            currentUser.role === userRole.STUDENT ||
            currentUser.role === userRole.PILOT
        ) {
            return logs.filter((l) => l.pilotID === currentUser.id);
        }
        if (currentUser.role === userRole.INSTRUCTOR) {
            // Instructor sees own logs + logs where they are the instructor
            return logs.filter(
                (l) =>
                    l.pilotID === currentUser.id ||
                    l.instructorID === currentUser.id
            );
        }
        // ADMIN / OWNER / MANAGER: see all
        return logs;
    }, [logs, currentUser]);

    // Build year options from logs
    const yearOptions = useMemo(() => {
        const years = new Set(logs.map((l) => new Date(l.date).getFullYear()));
        years.add(new Date().getFullYear());
        return Array.from(years).sort((a, b) => b - a);
    }, [logs]);

    const [selectedPlaneForExport, setSelectedPlaneForExport] = useState<string>("");
    const [exporting, setExporting] = useState(false);

    const handleCreated = (log: flight_logs) => {
        setLogs((prev) => [...prev, log]);
    };

    const handleExportPDF = useCallback(async () => {
        if (!currentUser) return;
        setExporting(true);
        try {
            let blob: Blob;
            let filename: string;

            if (activeTab === "pilot") {
                const pilotName = `${currentUser.lastName} ${currentUser.firstName}`;
                const pilotLogs = visibleLogs.filter((l) => l.pilotID === currentUser.id);
                blob = await pdf(
                    <PilotLogbookDocument logs={pilotLogs} pilotName={pilotName} year={selectedYear} />
                ).toBlob();
                filename = `carnet_de_vol_${currentUser.lastName}_${selectedYear}.pdf`;
            } else {
                const plane = planesProp.find((p) => p.id === selectedPlaneForExport);
                const planeLogs = dedupAircraftLogs(visibleLogs.filter((l) => l.planeID === selectedPlaneForExport));
                blob = await pdf(
                    <AircraftLogbookDocument
                        logs={planeLogs}
                        planeRegistration={plane?.immatriculation ?? ""}
                        planeName={plane?.name ?? ""}
                        year={selectedYear}
                    />
                ).toBlob();
                filename = `carnet_de_route_${plane?.immatriculation ?? "avion"}_${selectedYear}.pdf`;
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
    }, [activeTab, currentUser, visibleLogs, selectedYear, planesProp, selectedPlaneForExport]);

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
                        Carnet de Vol
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
                        Carnet de Route
                    </button>
                </div>
            )}

            {/* Tab content */}
            <div className="flex-1 min-h-0 overflow-hidden">
                {activeTab === "pilot" && (
                    <PilotLogbookTab logs={visibleLogs} users={usersProp} />
                )}
                {activeTab === "aircraft" && canSeeAircraftTab && (
                    <AircraftLogbookTab logs={visibleLogs} planes={planesProp} onPlaneChange={setSelectedPlaneForExport} />
                )}
            </div>
        </div>
    );
};

export default LogbookPageComponent;
