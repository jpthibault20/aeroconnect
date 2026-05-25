"use client";

import React, { useState, useEffect } from "react";
import { flight_logs, userRole } from "@prisma/client";
import { updateFlightLog, signFlightLog } from "@/api/db/logbook";
import { computeFlightTimes, formatNatureLong } from "@/lib/logbookCalc";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/SpinnerVariants";
import { FileText, CheckCircle2, ShieldCheck, Minus, Plus, Info, AlertTriangle } from "lucide-react";

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
    const canEditHobbsStart =
        currentUser?.role === userRole.OWNER || currentUser?.role === userRole.ADMIN;
    const [loading, setLoading] = useState(false);
    const [signing, setSigning] = useState(false);
    const [error, setError] = useState("");

    const [departureAirfield, setDepartureAirfield] = useState("");
    const [arrivalAirfield, setArrivalAirfield] = useState("");
    const [movements, setMovements] = useState(1);
    const [hobbsStartDisplay, setHobbsStartDisplay] = useState("");
    const [hobbsStartUnlocked, setHobbsStartUnlocked] = useState(false);
    const [hobbsEnd, setHobbsEnd] = useState("");
    const [fuelAdded, setFuelAdded] = useState("");
    const [machineAnomalies, setMachineAnomalies] = useState("RAS");
    const [personalObservation, setPersonalObservation] = useState("");

    useEffect(() => {
        if (log) {
            setDepartureAirfield(log.departureAirfield ?? defaultAirfield ?? "");
            setArrivalAirfield(log.arrivalAirfield ?? defaultAirfield ?? "");
            setMovements(Math.max(1, log.landings ?? log.takeoffs ?? 1));
            setHobbsStartDisplay(
                log.hobbsStart != null
                    ? String(log.hobbsStart)
                    : defaultHobbsStart != null
                        ? String(defaultHobbsStart)
                        : ""
            );
            setHobbsEnd(log.hobbsEnd != null ? String(log.hobbsEnd) : "");
            setFuelAdded(log.fuelAdded != null ? String(log.fuelAdded) : "");
            setMachineAnomalies(log.machineAnomalies ?? "RAS");
            setPersonalObservation(log.personalObservation ?? "");
            setHobbsStartUnlocked(false);
        }
    }, [log, defaultAirfield, defaultHobbsStart]);

    const isSigned = log?.pilotSigned ?? false;
    const isReadOnly = isSigned || isStudent;

    if (!log) return null;

    // Vol sans machine (théorique ou perso)
    const hasPlane = !!log.planeID;

    // Durée affichée : recalculée à la volée depuis les hobbs (saisis ou
    // stockés). Si rien n'est saisi, on n'affiche pas de durée.
    const previewTimes = computeFlightTimes({
        hobbsStart: log.hobbsStart ?? (defaultHobbsStart ?? null),
        hobbsEnd: hobbsEnd ? parseFloat(hobbsEnd) : (log.hobbsEnd ?? null),
        pilotFunction: log.pilotFunction,
    });

    const handleSave = async (andSign: boolean) => {
        setError("");
        if (hasPlane) {
            const startVal = hobbsStartDisplay ? parseFloat(hobbsStartDisplay) : null;
            const endVal = hobbsEnd ? parseFloat(hobbsEnd) : null;

            if (andSign) {
                if (startVal == null || isNaN(startVal)) {
                    setError("Les heures moteur de début sont obligatoires pour signer.");
                    return;
                }
                if (endVal == null || isNaN(endVal) || endVal <= startVal) {
                    setError("Les heures moteur de fin doivent être supérieures à celles de début.");
                    return;
                }
            } else if (startVal != null && endVal != null && endVal <= startVal) {
                setError("Les heures moteur de fin doivent être supérieures à celles de début.");
                return;
            }
        }

        if (andSign) setSigning(true);
        else setLoading(true);

        try {
            const overrideHobbsStart =
                canEditHobbsStart && hobbsStartUnlocked && hobbsStartDisplay
                    ? parseFloat(hobbsStartDisplay)
                    : undefined;
            const res = await updateFlightLog(log.id, {
                departureAirfield: departureAirfield || undefined,
                arrivalAirfield: arrivalAirfield || undefined,
                takeoffs: movements,
                landings: movements,
                hobbsStart: overrideHobbsStart,
                hobbsEnd: hobbsEnd ? parseFloat(hobbsEnd) : undefined,
                fuelAdded: fuelAdded ? parseFloat(fuelAdded) : undefined,
                machineAnomalies: machineAnomalies || "RAS",
                personalObservation: personalObservation || undefined,
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
                takeoffs: movements,
                landings: movements,
                hobbsStart: overrideHobbsStart != null ? overrideHobbsStart : log.hobbsStart,
                hobbsEnd: hobbsEnd ? parseFloat(hobbsEnd) : null,
                fuelAdded: fuelAdded ? parseFloat(fuelAdded) : null,
                machineAnomalies: machineAnomalies || null,
                personalObservation: personalObservation || null,
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
            <DialogContent className="w-[95%] sm:max-w-[600px] max-h-[85vh] p-0 gap-0 bg-white rounded-xl sm:rounded-2xl border-none shadow-2xl overflow-hidden !flex !flex-col">

                {/* Header */}
                <div className="bg-slate-50 p-4 sm:p-6 border-b border-slate-100 flex-shrink-0 rounded-t-xl sm:rounded-t-2xl">
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
                            {" — "}{formatNatureLong(log.flightNature, log.instructionSubType)}
                            {previewTimes.durationMinutes > 0 && <> — {convertMinutesToHours(previewTimes.durationMinutes)}</>}
                            <br />Pilote : {log.pilotFirstName} {log.pilotLastName}
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
                <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 overflow-y-auto flex-1 min-h-0">
                    {isSigned && (
                        <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-md text-sm text-emerald-700">
                            <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>Ce vol est signé et verrouillé. Aucune modification n&apos;est possible.</span>
                        </div>
                    )}
                    {!isSigned && isStudent && (
                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-md text-sm text-amber-700">
                            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>Seul votre instructeur peut compléter ce vol. Vous y avez accès en lecture.</span>
                        </div>
                    )}
                    {/* Aérodromes */}
                    <div className="space-y-4">
                        <h3 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider">
                            Aérodromes
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-600 text-sm">Départ</Label>
                                <Input value={departureAirfield} onChange={(e) => setDepartureAirfield(e.target.value.toUpperCase())} placeholder="LFXXXX" maxLength={6} readOnly={isReadOnly} className={`font-mono uppercase text-sm ${inputClass}`} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-600 text-sm">Arrivée</Label>
                                <Input value={arrivalAirfield} onChange={(e) => setArrivalAirfield(e.target.value.toUpperCase())} placeholder="LFXXXX" maxLength={6} readOnly={isReadOnly} className={`font-mono uppercase text-sm ${inputClass}`} />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* Mouvements */}
                    <div className="space-y-4">
                        <h3 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider">
                            Mouvements
                        </h3>
                        <div className="space-y-3 flex flex-col items-center">
                            <Label className="text-slate-600 text-sm">Atterrissage / Décollage</Label>
                            <div className={`inline-flex h-10 items-stretch overflow-hidden rounded-lg border border-slate-200 shadow-sm ${isReadOnly ? "bg-slate-100" : "bg-white"}`}>
                                <button type="button" disabled={isReadOnly || movements <= 1} onClick={() => setMovements((v) => Math.max(1, v - 1))} className="flex w-10 items-center justify-center text-slate-600 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                                    <Minus className="w-4 h-4" />
                                </button>
                                <div className="flex min-w-[3rem] items-center justify-center border-x border-slate-200 bg-slate-50/60 px-2 text-base font-semibold text-[#774BBE] tabular-nums">
                                    {movements}
                                </div>
                                <button type="button" disabled={isReadOnly} onClick={() => setMovements((v) => v + 1)} className="flex w-10 items-center justify-center text-slate-600 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Machine — masqué si pas d'avion */}
                    {hasPlane && (
                        <>
                            <div className="h-px bg-slate-100 w-full" />
                            <div className="space-y-4">
                                <h3 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider">
                                    Machine
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-600 text-sm">Heures moteur début</Label>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            value={hobbsStartDisplay}
                                            onChange={(e) => setHobbsStartDisplay(e.target.value)}
                                            placeholder="—"
                                            readOnly={!hobbsStartUnlocked || isReadOnly}
                                            className={
                                                hobbsStartUnlocked && !isReadOnly
                                                    ? "bg-slate-50 border-slate-200 focus:ring-[#774BBE] font-mono text-sm"
                                                    : "bg-slate-100 border-slate-200 text-slate-500 cursor-default font-mono text-sm"
                                            }
                                        />
                                        {log.hobbsStart == null && !isReadOnly && !hobbsStartUnlocked && (
                                            <p className="text-xs text-slate-400 italic">Valeur lue sur l&apos;aéronef, figée à la signature.</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-600 text-sm">Heures moteur fin</Label>
                                        <Input type="number" step="0.1" value={hobbsEnd} onChange={(e) => setHobbsEnd(e.target.value)} placeholder="0.0" readOnly={isReadOnly} className={`font-mono text-sm ${inputClass}`} />
                                    </div>
                                    {canEditHobbsStart && !isReadOnly && (
                                        <div className="col-span-2 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id="unlock-hobbs-start"
                                                    checked={hobbsStartUnlocked}
                                                    onCheckedChange={(c) => setHobbsStartUnlocked(c === true)}
                                                />
                                                <Label htmlFor="unlock-hobbs-start" className="text-slate-600 text-sm cursor-pointer">
                                                    Modifier l&apos;heure moteur de début (admin)
                                                </Label>
                                            </div>
                                            {hobbsStartUnlocked && (
                                                <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-md">
                                                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                                    <p className="text-xs text-red-700">
                                                        Mauvaise pratique : l&apos;heure de début doit normalement refléter le hobbs courant de l&apos;aéronef.
                                                        Ne modifier qu&apos;en cas d&apos;erreur de saisie avérée.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="space-y-2 col-span-2">
                                        <Label className="text-slate-600 text-sm">Carburant ajouté (L)</Label>
                                        <Input type="number" step="0.1" value={fuelAdded} onChange={(e) => setFuelAdded(e.target.value)} placeholder="0.0" readOnly={isReadOnly} className={`text-sm ${inputClass}`} />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="h-px bg-slate-100 w-full" />

                    {/* Observations */}
                    <div className="space-y-4">
                        <h3 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider">
                            Observations
                        </h3>
                        <div className="space-y-2">
                            <Label className="text-slate-600 text-sm">Anomalie machine</Label>
                            <Textarea value={machineAnomalies} onChange={(e) => setMachineAnomalies(e.target.value)} placeholder="RAS" readOnly={isReadOnly} className={`text-sm min-h-[60px] ${inputClass}`} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-600 text-sm">Observation personnel</Label>
                            <Textarea value={personalObservation} onChange={(e) => setPersonalObservation(e.target.value)} placeholder="Vos observations sur le vol..." readOnly={isReadOnly} className={`text-sm min-h-[60px] ${inputClass}`} />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-4 sm:p-6 border-t border-slate-100 flex flex-col gap-4 flex-shrink-0 rounded-b-xl sm:rounded-b-2xl">
                    {error && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md text-sm">
                            <span>{error}</span>
                        </div>
                    )}

                    <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                        {isReadOnly ? (
                            <Button onClick={() => onOpenChange(false)} className="bg-slate-600 hover:bg-slate-700 text-white w-full sm:w-auto">
                                Fermer
                            </Button>
                        ) : (
                            <>
                                <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading || signing} className="text-slate-500 hover:text-slate-700 hover:bg-slate-200 w-full sm:w-auto">
                                    Annuler
                                </Button>
                                <Button onClick={() => handleSave(false)} disabled={loading || signing} variant="outline" className="border-slate-200 w-full sm:w-auto">
                                    {loading ? <Spinner className="w-4 h-4" /> : "Enregistrer"}
                                </Button>
                                <Button onClick={() => handleSave(true)} disabled={loading || signing} className="bg-[#774BBE] hover:bg-[#6538a5] text-white w-full sm:w-auto sm:min-w-[140px]">
                                    {signing ? (
                                        <div className="flex items-center gap-2"><Spinner className="w-4 h-4 text-white" /><span>Signature...</span></div>
                                    ) : (
                                        <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>Enregistrer et signer</span></div>
                                    )}
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </div>

            </DialogContent>
        </Dialog>
    );
};

export default CompleteFlightDialog;
