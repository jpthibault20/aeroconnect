"use client";

import React, { useState, useEffect } from "react";
import { flight_logs } from "@prisma/client";
import { updateFlightLog, signFlightLog } from "@/api/db/logbook";
import { convertMinutesToHours } from "@/api/global function/dateServeur";
import { toast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/SpinnerVariants";
import { Plane, MapPin, Gauge, FileText, CheckCircle2 } from "lucide-react";

interface Props {
    log: flight_logs | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCompleted: (updated: flight_logs) => void;
    /** Texte en haut du dialog quand il y a plusieurs vols */
    queueInfo?: string;
}

const NATURE_LABELS: Record<string, string> = {
    INSTRUCTION: "Instruction", LOCAL: "Local", NAVIGATION: "Navigation",
    VLO: "VLO", VLD: "VLD", EXAM: "Examen", FIRST_FLIGHT: "1er vol",
    BAPTEME: "Baptême", OTHER: "Autre",
};

const CompleteFlightDialog = ({ log, open, onOpenChange, onCompleted, queueInfo }: Props) => {
    const [loading, setLoading] = useState(false);
    const [signing, setSigning] = useState(false);

    // Form state
    const [departureAirfield, setDepartureAirfield] = useState("");
    const [arrivalAirfield, setArrivalAirfield] = useState("");
    const [takeoffs, setTakeoffs] = useState(1);
    const [landings, setLandings] = useState(1);
    const [hobbsStart, setHobbsStart] = useState("");
    const [hobbsEnd, setHobbsEnd] = useState("");
    const [fuelAdded, setFuelAdded] = useState("");
    const [oilAdded, setOilAdded] = useState("");
    const [anomalies, setAnomalies] = useState("RAS");
    const [remarks, setRemarks] = useState("");

    // Reset form when log changes
    useEffect(() => {
        if (log) {
            setDepartureAirfield(log.departureAirfield ?? "");
            setArrivalAirfield(log.arrivalAirfield ?? "");
            setTakeoffs(log.takeoffs);
            setLandings(log.landings);
            setHobbsStart(log.hobbsStart != null ? String(log.hobbsStart) : "");
            setHobbsEnd(log.hobbsEnd != null ? String(log.hobbsEnd) : "");
            setFuelAdded(log.fuelAdded != null ? String(log.fuelAdded) : "");
            setOilAdded(log.oilAdded != null ? String(log.oilAdded) : "");
            setAnomalies(log.anomalies ?? "RAS");
            setRemarks(log.remarks ?? "");
        }
    }, [log]);

    if (!log) return null;

    const handleSave = async (andSign: boolean) => {
        if (andSign) setSigning(true);
        else setLoading(true);

        try {
            const res = await updateFlightLog(log.id, {
                departureAirfield: departureAirfield || undefined,
                arrivalAirfield: arrivalAirfield || undefined,
                takeoffs,
                landings,
                hobbsStart: hobbsStart ? parseFloat(hobbsStart) : undefined,
                hobbsEnd: hobbsEnd ? parseFloat(hobbsEnd) : undefined,
                fuelAdded: fuelAdded ? parseFloat(fuelAdded) : undefined,
                oilAdded: oilAdded ? parseFloat(oilAdded) : undefined,
                anomalies: anomalies || "RAS",
                remarks: remarks || undefined,
            });

            if ("error" in res) {
                toast({ title: "Erreur", description: res.error, variant: "destructive" });
                return;
            }

            if (andSign) {
                const signRes = await signFlightLog(log.id);
                if ("error" in signRes) {
                    toast({ title: "Erreur signature", description: signRes.error, variant: "destructive" });
                    return;
                }
            }

            toast({
                title: andSign ? "Vol complété et signé" : "Vol mis à jour",
                className: "bg-green-600 text-white border-none",
            });

            onCompleted({
                ...log,
                departureAirfield: departureAirfield || null,
                arrivalAirfield: arrivalAirfield || null,
                takeoffs,
                landings,
                hobbsStart: hobbsStart ? parseFloat(hobbsStart) : null,
                hobbsEnd: hobbsEnd ? parseFloat(hobbsEnd) : null,
                fuelAdded: fuelAdded ? parseFloat(fuelAdded) : null,
                oilAdded: oilAdded ? parseFloat(oilAdded) : null,
                anomalies: anomalies || null,
                remarks: remarks || null,
                pilotSigned: andSign ? true : log.pilotSigned,
                pilotSignedAt: andSign ? new Date() : log.pilotSignedAt,
            });
        } catch {
            toast({ title: "Erreur technique", variant: "destructive" });
        } finally {
            setLoading(false);
            setSigning(false);
        }
    };

    const companion = log.pilotFunction === "EP"
        ? `Instructeur : ${log.instructorFirstName ?? ""} ${log.instructorLastName ?? ""}`.trim()
        : log.pilotFunction === "I"
            ? `Élève : ${log.studentFirstName ?? ""} ${log.studentLastName ?? ""}`.trim()
            : "";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95%] sm:max-w-[520px] max-h-[90vh] p-0 gap-0 bg-white rounded-xl sm:rounded-2xl border-none shadow-2xl flex flex-col">
                {/* Header */}
                <div className="bg-slate-50 p-4 sm:p-6 border-b border-slate-100 flex-shrink-0 rounded-t-xl sm:rounded-t-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <div className="p-2 bg-[#774BBE]/10 rounded-lg">
                                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#774BBE]" />
                            </div>
                            Compléter le vol
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 ml-11 text-xs sm:text-sm">
                            {new Date(log.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                            {" — "}{log.planeName} ({log.planeRegistration})
                            {" — "}{convertMinutesToHours(log.durationMinutes)}
                            {companion && <><br />{companion}</>}
                        </DialogDescription>
                    </DialogHeader>
                    {queueInfo && (
                        <div className="mt-2 ml-11 text-xs text-[#774BBE] font-medium">{queueInfo}</div>
                    )}
                </div>

                {/* Body */}
                <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-grow">
                    {/* Aérodromes */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5" /> Aérodromes
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-slate-600 text-xs">Départ (OACI)</Label>
                                <Input
                                    value={departureAirfield}
                                    onChange={(e) => setDepartureAirfield(e.target.value.toUpperCase())}
                                    placeholder="LFXX"
                                    className="bg-slate-50 border-slate-200 font-mono uppercase text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-slate-600 text-xs">Arrivée (OACI)</Label>
                                <Input
                                    value={arrivalAirfield}
                                    onChange={(e) => setArrivalAirfield(e.target.value.toUpperCase())}
                                    placeholder="LFXX"
                                    className="bg-slate-50 border-slate-200 font-mono uppercase text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Décollages / Atterrissages */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Plane className="w-3.5 h-3.5" /> Mouvements
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-slate-600 text-xs">Décollages</Label>
                                <Input
                                    type="number" min={0}
                                    value={takeoffs}
                                    onChange={(e) => setTakeoffs(parseInt(e.target.value) || 0)}
                                    className="bg-slate-50 border-slate-200 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-slate-600 text-xs">Atterrissages</Label>
                                <Input
                                    type="number" min={0}
                                    value={landings}
                                    onChange={(e) => setLandings(parseInt(e.target.value) || 0)}
                                    className="bg-slate-50 border-slate-200 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Machine */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Gauge className="w-3.5 h-3.5" /> Machine
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-slate-600 text-xs">Hobbs début</Label>
                                <Input
                                    type="number" step="0.1"
                                    value={hobbsStart}
                                    onChange={(e) => setHobbsStart(e.target.value)}
                                    placeholder="0.0"
                                    className="bg-slate-50 border-slate-200 font-mono text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-slate-600 text-xs">Hobbs fin</Label>
                                <Input
                                    type="number" step="0.1"
                                    value={hobbsEnd}
                                    onChange={(e) => setHobbsEnd(e.target.value)}
                                    placeholder="0.0"
                                    className="bg-slate-50 border-slate-200 font-mono text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-slate-600 text-xs">Carburant ajouté (L)</Label>
                                <Input
                                    type="number" step="0.1"
                                    value={fuelAdded}
                                    onChange={(e) => setFuelAdded(e.target.value)}
                                    placeholder="0.0"
                                    className="bg-slate-50 border-slate-200 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-slate-600 text-xs">Huile ajoutée (L)</Label>
                                <Input
                                    type="number" step="0.01"
                                    value={oilAdded}
                                    onChange={(e) => setOilAdded(e.target.value)}
                                    placeholder="0.0"
                                    className="bg-slate-50 border-slate-200 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Anomalies */}
                    <div className="space-y-1">
                        <Label className="text-slate-600 text-xs">Anomalies constatées</Label>
                        <Textarea
                            value={anomalies}
                            onChange={(e) => setAnomalies(e.target.value)}
                            placeholder="RAS"
                            className="bg-slate-50 border-slate-200 text-sm min-h-[60px]"
                        />
                    </div>

                    {/* Remarques */}
                    <div className="space-y-1">
                        <Label className="text-slate-600 text-xs">Remarques / observations</Label>
                        <Textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Remarques sur le vol..."
                            className="bg-slate-50 border-slate-200 text-sm min-h-[60px]"
                        />
                    </div>
                </div>

                {/* Footer */}
                <DialogFooter className="bg-slate-50 p-4 sm:p-6 border-t border-slate-100 flex-shrink-0 rounded-b-xl sm:rounded-b-2xl flex-col sm:flex-row gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={loading || signing}
                        className="text-slate-500 hover:text-slate-700 w-full sm:w-auto"
                    >
                        Plus tard
                    </Button>
                    <Button
                        onClick={() => handleSave(false)}
                        disabled={loading || signing}
                        variant="outline"
                        className="border-slate-200 w-full sm:w-auto"
                    >
                        {loading ? <Spinner className="w-4 h-4" /> : "Enregistrer"}
                    </Button>
                    {!log.pilotSigned && (
                        <Button
                            onClick={() => handleSave(true)}
                            disabled={loading || signing}
                            className="bg-[#774BBE] hover:bg-[#6538a5] text-white w-full sm:w-auto"
                        >
                            {signing ? (
                                <div className="flex items-center gap-2">
                                    <Spinner className="w-4 h-4 text-white" />
                                    <span>Signature...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Enregistrer et signer</span>
                                </div>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CompleteFlightDialog;
