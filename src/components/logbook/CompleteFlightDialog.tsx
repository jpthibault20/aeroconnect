"use client";

import React, { useState, useEffect } from "react";
import { flight_logs, userRole } from "@prisma/client";
import { updateFlightLog, signFlightLog } from "@/api/db/logbook";
import { convertMinutesToHours } from "@/api/global function/dateServeur";
import { toast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/app/context/useCurrentUser";
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
import { Plane, MapPin, Gauge, FileText, CheckCircle2, ShieldCheck } from "lucide-react";

interface Props {
    log: flight_logs | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCompleted: (updated: flight_logs) => void;
    queueInfo?: string;
    defaultAirfield?: string;
    defaultHobbsStart?: number;
}

const CompleteFlightDialog = ({ log, open, onOpenChange, onCompleted, queueInfo, defaultAirfield, defaultHobbsStart }: Props) => {
    const { currentUser } = useCurrentUser();
    const isStudent = currentUser?.role === userRole.STUDENT;
    const [loading, setLoading] = useState(false);
    const [signing, setSigning] = useState(false);

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

    useEffect(() => {
        if (log) {
            setDepartureAirfield(log.departureAirfield ?? defaultAirfield ?? "");
            setArrivalAirfield(log.arrivalAirfield ?? defaultAirfield ?? "");
            setTakeoffs(log.takeoffs);
            setLandings(log.landings);
            setHobbsStart(log.hobbsStart != null ? String(log.hobbsStart) : defaultHobbsStart != null ? String(defaultHobbsStart) : "");
            setHobbsEnd(log.hobbsEnd != null ? String(log.hobbsEnd) : "");
            setFuelAdded(log.fuelAdded != null ? String(log.fuelAdded) : "");
            setOilAdded(log.oilAdded != null ? String(log.oilAdded) : "");
            setAnomalies(log.anomalies ?? "RAS");
            setRemarks(log.remarks ?? "");
        }
    }, [log, defaultAirfield, defaultHobbsStart]);

    const isSigned = log?.pilotSigned ?? false;
    const isReadOnly = isSigned || isStudent;

    if (!log) return null;

    // Vol sans machine (théorique ou perso)
    const hasPlane = !!log.planeID;

    const handleSave = async (andSign: boolean) => {
        if (hasPlane) {
            if (andSign) {
                if (!hobbsStart || isNaN(parseFloat(hobbsStart))) {
                    toast({ title: "Erreur", description: "Les heures moteur de début sont obligatoires pour signer.", variant: "destructive" });
                    return;
                }
                if (!hobbsEnd || isNaN(parseFloat(hobbsEnd)) || parseFloat(hobbsEnd) <= parseFloat(hobbsStart)) {
                    toast({ title: "Erreur", description: "Les heures moteur de fin doivent être supérieures à celles de début.", variant: "destructive" });
                    return;
                }
            } else if (hobbsStart && hobbsEnd && parseFloat(hobbsEnd) <= parseFloat(hobbsStart)) {
                toast({ title: "Erreur", description: "Les heures moteur de fin doivent être supérieures à celles de début.", variant: "destructive" });
                return;
            }
        }

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

    const inputClass = isReadOnly
        ? "bg-slate-100 border-slate-200 text-slate-500 cursor-default"
        : "bg-slate-50 border-slate-200";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95%] sm:max-w-[520px] max-h-[90vh] p-0 gap-0 bg-white rounded-xl sm:rounded-2xl border-none shadow-2xl overflow-hidden !flex !flex-col">

                {/* Header */}
                <div className={`${isSigned ? "bg-emerald-50" : "bg-slate-50"} p-4 sm:p-6 border-b ${isSigned ? "border-emerald-100" : "border-slate-100"} flex-shrink-0 rounded-t-xl sm:rounded-t-2xl`}>
                    <DialogHeader>
                        <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <div className={`p-2 ${isSigned ? "bg-emerald-100" : "bg-[#774BBE]/10"} rounded-lg`}>
                                {isSigned
                                    ? <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                                    : <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#774BBE]" />
                                }
                            </div>
                            {isSigned ? "Vol signé" : "Compléter le vol"}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 ml-11 text-xs sm:text-sm">
                            {new Date(log.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                            {" — "}{log.planeName} ({log.planeRegistration})
                            {" — "}{convertMinutesToHours(log.durationMinutes)}
                            {companion && <><br />{companion}</>}
                        </DialogDescription>
                    </DialogHeader>
                    {isSigned && log.pilotSignedAt && (
                        <div className="mt-2 ml-11 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Signé le {new Date(log.pilotSignedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        </div>
                    )}
                    {queueInfo && (
                        <div className="mt-2 ml-11 text-xs text-[#774BBE] font-medium">{queueInfo}</div>
                    )}
                </div>

                {/* Body — scrollable */}
                <div className={`p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 min-h-0 ${isReadOnly ? "opacity-60" : ""}`}>
                    {/* Aérodromes */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5" /> Aérodromes
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-slate-600 text-xs">Départ (OACI)</Label>
                                <Input value={departureAirfield} onChange={(e) => setDepartureAirfield(e.target.value.toUpperCase())} placeholder="LFXX" readOnly={isReadOnly} className={`font-mono uppercase text-sm ${inputClass}`} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-slate-600 text-xs">Arrivée (OACI)</Label>
                                <Input value={arrivalAirfield} onChange={(e) => setArrivalAirfield(e.target.value.toUpperCase())} placeholder="LFXX" readOnly={isReadOnly} className={`font-mono uppercase text-sm ${inputClass}`} />
                            </div>
                        </div>
                    </div>

                    {/* Mouvements */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Plane className="w-3.5 h-3.5" /> Mouvements
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-slate-600 text-xs">Décollages</Label>
                                <Input type="number" min={0} value={takeoffs} onChange={(e) => setTakeoffs(parseInt(e.target.value) || 0)} readOnly={isReadOnly} className={`text-sm ${inputClass}`} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-slate-600 text-xs">Atterrissages</Label>
                                <Input type="number" min={0} value={landings} onChange={(e) => setLandings(parseInt(e.target.value) || 0)} readOnly={isReadOnly} className={`text-sm ${inputClass}`} />
                            </div>
                        </div>
                    </div>

                    {/* Machine — masqué si pas d'avion */}
                    {hasPlane && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Gauge className="w-3.5 h-3.5" /> Machine
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-slate-600 text-xs">Heures moteur début</Label>
                                    <Input type="number" step="0.1" value={hobbsStart} onChange={(e) => setHobbsStart(e.target.value)} placeholder="0.0" readOnly={isReadOnly} className={`font-mono text-sm ${inputClass}`} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-slate-600 text-xs">Heures moteur fin</Label>
                                    <Input type="number" step="0.1" value={hobbsEnd} onChange={(e) => setHobbsEnd(e.target.value)} placeholder="0.0" readOnly={isReadOnly} className={`font-mono text-sm ${inputClass}`} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-slate-600 text-xs">Carburant ajouté (L)</Label>
                                    <Input type="number" step="0.1" value={fuelAdded} onChange={(e) => setFuelAdded(e.target.value)} placeholder="0.0" readOnly={isReadOnly} className={`text-sm ${inputClass}`} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-slate-600 text-xs">Huile ajoutée (L)</Label>
                                    <Input type="number" step="0.01" value={oilAdded} onChange={(e) => setOilAdded(e.target.value)} placeholder="0.0" readOnly={isReadOnly} className={`text-sm ${inputClass}`} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Anomalies */}
                    <div className="space-y-1">
                        <Label className="text-slate-600 text-xs">Anomalies constatées</Label>
                        <Textarea value={anomalies} onChange={(e) => setAnomalies(e.target.value)} placeholder="RAS" readOnly={isReadOnly} className={`text-sm min-h-[60px] ${inputClass}`} />
                    </div>

                    {/* Remarques */}
                    <div className="space-y-1">
                        <Label className="text-slate-600 text-xs">Remarques / observations</Label>
                        <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarques sur le vol..." readOnly={isReadOnly} className={`text-sm min-h-[60px] ${inputClass}`} />
                    </div>
                </div>

                {/* Footer */}
                <DialogFooter className={`${isSigned ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"} p-4 sm:p-6 border-t flex-shrink-0 rounded-b-xl sm:rounded-b-2xl flex-col sm:flex-row gap-2`}>
                    {isReadOnly ? (
                        <Button onClick={() => onOpenChange(false)} className={`${isSigned ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-600 hover:bg-slate-700"} text-white w-full sm:w-auto`}>
                            Fermer
                        </Button>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading || signing} className="text-slate-500 hover:text-slate-700 w-full sm:w-auto">
                                Plus tard
                            </Button>
                            <Button onClick={() => handleSave(false)} disabled={loading || signing} variant="outline" className="border-slate-200 w-full sm:w-auto">
                                {loading ? <Spinner className="w-4 h-4" /> : "Enregistrer"}
                            </Button>
                            <Button onClick={() => handleSave(true)} disabled={loading || signing} className="bg-[#774BBE] hover:bg-[#6538a5] text-white w-full sm:w-auto">
                                {signing ? (
                                    <div className="flex items-center gap-2"><Spinner className="w-4 h-4 text-white" /><span>Signature...</span></div>
                                ) : (
                                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>Enregistrer et signer</span></div>
                                )}
                            </Button>
                        </>
                    )}
                </DialogFooter>

            </DialogContent>
        </Dialog>
    );
};

export default CompleteFlightDialog;
