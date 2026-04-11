"use client";

import React, { useState } from "react";
import { flight_logs, planes, User, flightNature, pilotFunction, userRole } from "@prisma/client";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { createFlightLog, CreateFlightLogInput } from "@/api/db/logbook";
import { toast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/SpinnerVariants";
import {
    PlusIcon,
    BookOpen,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
    planes: planes[];
    users: User[];
    onCreated: (log: flight_logs) => void;
}

const NATURE_OPTIONS: { value: flightNature; label: string }[] = [
    { value: "INSTRUCTION", label: "Instruction" },
    { value: "LOCAL", label: "Local" },
    { value: "NAVIGATION", label: "Navigation" },
    { value: "VLO", label: "VLO" },
    { value: "VLD", label: "VLD" },
    { value: "EXAM", label: "Examen" },
    { value: "FIRST_FLIGHT", label: "Premier vol" },
    { value: "BAPTEME", label: "Bapteme" },
    { value: "OTHER", label: "Autre" },
];

const FUNCTION_OPTIONS: { value: pilotFunction; label: string }[] = [
    { value: "EP", label: "Eleve-Pilote (EP)" },
    { value: "P", label: "Pilote / CdB (P)" },
    { value: "I", label: "Instructeur (I)" },
];

interface FormData {
    date: string;
    planeID: string;
    nature: flightNature;
    duration: number;
    takeoffs: number;
    landings: number;
    fonction: pilotFunction;
    instructorID: string;
    studentID: string;
    departure: string;
    arrival: string;
    hobbsStart: string;
    hobbsEnd: string;
    fuel: string;
    oil: string;
    anomalies: string;
    remarks: string;
}

const NewFlightLogDialog = ({ planes: planesList, users, onCreated }: Props) => {
    const { currentUser } = useCurrentUser();
    const { currentClub } = useCurrentClub();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [machineOpen, setMachineOpen] = useState(false);

    const today = new Date().toISOString().split("T")[0];

    const [form, setForm] = useState<FormData>({
        date: today,
        planeID: "",
        nature: "INSTRUCTION",
        duration: 60,
        takeoffs: 1,
        landings: 1,
        fonction: "EP",
        instructorID: "",
        studentID: "",
        departure: "",
        arrival: "",
        hobbsStart: "",
        hobbsEnd: "",
        fuel: "",
        oil: "",
        anomalies: "",
        remarks: "",
    });

    const instructors = users.filter(
        (u) =>
            u.role === userRole.INSTRUCTOR ||
            u.role === userRole.OWNER ||
            u.role === userRole.ADMIN
    );

    const students = users.filter(
        (u) => u.role === userRole.STUDENT || u.role === userRole.PILOT
    );

    const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const resetForm = () => {
        setForm({
            date: today,
            planeID: "",
            nature: "INSTRUCTION",
            duration: 60,
            takeoffs: 1,
            landings: 1,
            fonction: "EP",
            instructorID: "",
            studentID: "",
            departure: "",
            arrival: "",
            hobbsStart: "",
            hobbsEnd: "",
            fuel: "",
            oil: "",
            anomalies: "",
            remarks: "",
        });
        setError("");
        setMachineOpen(false);
    };

    const onConfirm = async () => {
        setLoading(true);
        setError("");

        if (!form.date) {
            setError("Veuillez saisir une date.");
            setLoading(false);
            return;
        }
        if (!form.planeID) {
            setError("Veuillez selectionner un aeronef.");
            setLoading(false);
            return;
        }
        if (!form.duration || form.duration <= 0) {
            setError("La duree doit etre superieure a 0.");
            setLoading(false);
            return;
        }

        const selectedPlane = planesList.find((p) => p.id === form.planeID);
        if (!selectedPlane) {
            setError("Aeronef introuvable.");
            setLoading(false);
            return;
        }

        // Determine pilot based on function
        let pilotID = currentUser?.id ?? "";
        let pilotFirstName = currentUser?.firstName ?? "";
        let pilotLastName = currentUser?.lastName ?? "";
        let instructorID: string | undefined;
        let instructorFirstName: string | undefined;
        let instructorLastName: string | undefined;
        let studentID: string | undefined;
        let studentFirstName: string | undefined;
        let studentLastName: string | undefined;

        if (form.fonction === "EP") {
            // Current user is the student-pilot, need an instructor
            if (form.instructorID) {
                const instr = users.find((u) => u.id === form.instructorID);
                if (instr) {
                    instructorID = instr.id;
                    instructorFirstName = instr.firstName;
                    instructorLastName = instr.lastName;
                }
            }
        } else if (form.fonction === "I") {
            // Current user is instructor, need a student
            if (form.studentID) {
                const stud = users.find((u) => u.id === form.studentID);
                if (stud) {
                    studentID = stud.id;
                    studentFirstName = stud.firstName ?? undefined;
                    studentLastName = stud.lastName ?? undefined;
                }
            }
        }

        const input: CreateFlightLogInput = {
            clubID: currentClub?.id ?? currentUser?.clubID ?? "",
            date: new Date(form.date),
            planeID: selectedPlane.id,
            planeRegistration: selectedPlane.immatriculation,
            planeName: selectedPlane.name,
            planeClass: selectedPlane.classes,
            pilotID,
            pilotFirstName,
            pilotLastName,
            pilotFunction: form.fonction,
            instructorID,
            instructorFirstName,
            instructorLastName,
            studentID,
            studentFirstName,
            studentLastName,
            flightNature: form.nature,
            durationMinutes: form.duration,
            takeoffs: form.takeoffs,
            landings: form.landings,
            departureAirfield: form.departure || undefined,
            arrivalAirfield: form.arrival || undefined,
            hobbsStart: form.hobbsStart ? parseFloat(form.hobbsStart) : undefined,
            hobbsEnd: form.hobbsEnd ? parseFloat(form.hobbsEnd) : undefined,
            fuelAdded: form.fuel ? parseFloat(form.fuel) : undefined,
            oilAdded: form.oil ? parseFloat(form.oil) : undefined,
            anomalies: form.anomalies || undefined,
            remarks: form.remarks || undefined,
            isManualEntry: true,
        };

        try {
            const res = await createFlightLog(input);
            if ("error" in res) {
                setError(res.error ?? "Erreur inconnue");
            } else if (res.log) {
                toast({
                    title: "Entree creee",
                    description: "L'entree de carnet a ete enregistree.",
                    className: "bg-green-600 text-white border-none",
                });
                onCreated(res.log);
                setOpen(false);
                resetForm();
            }
        } catch {
            setError("Une erreur technique est survenue.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(val) => {
                setOpen(val);
                if (!val) resetForm();
            }}
        >
            <DialogTrigger asChild>
                <Button className="bg-[#774BBE] hover:bg-[#6538a5] text-white shadow-md gap-2 transition-colors">
                    <PlusIcon className="w-4 h-4" />
                    Nouvelle entree
                </Button>
            </DialogTrigger>

            <DialogContent className="w-[95%] sm:max-w-[600px] max-h-[85vh] p-0 gap-0 bg-white rounded-xl sm:rounded-2xl border-none shadow-2xl flex flex-col">
                {/* Header */}
                <div className="bg-slate-50 p-4 sm:p-6 border-b border-slate-100 flex-shrink-0 rounded-t-xl sm:rounded-t-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <div className="p-2 bg-[#774BBE]/10 rounded-lg">
                                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-[#774BBE]" />
                            </div>
                            Nouvelle entree de carnet
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 ml-11 text-xs sm:text-sm">
                            Ajoutez manuellement un vol au carnet.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Scrollable content */}
                <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 overflow-y-auto flex-grow">
                    {/* Section 1: Vol */}
                    <div className="space-y-4">
                        <h3 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider">
                            Vol
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-600 text-sm">Date</Label>
                                <Input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => updateField("date", e.target.value)}
                                    className="bg-slate-50 border-slate-200 focus:ring-[#774BBE]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-600 text-sm">Aeronef</Label>
                                <Select
                                    value={form.planeID}
                                    onValueChange={(val) => updateField("planeID", val)}
                                >
                                    <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-[#774BBE]">
                                        <SelectValue placeholder="Selectionner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {planesList.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name} ({p.immatriculation})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-600 text-sm">Nature du vol</Label>
                                <Select
                                    value={form.nature}
                                    onValueChange={(val) => updateField("nature", val as flightNature)}
                                >
                                    <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-[#774BBE]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {NATURE_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-600 text-sm">Duree (min)</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={form.duration}
                                    onChange={(e) => updateField("duration", parseInt(e.target.value) || 0)}
                                    className="bg-slate-50 border-slate-200 focus:ring-[#774BBE]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                    <Label className="text-slate-600 text-sm">Dec.</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={form.takeoffs}
                                        onChange={(e) => updateField("takeoffs", parseInt(e.target.value) || 0)}
                                        className="bg-slate-50 border-slate-200 focus:ring-[#774BBE]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-600 text-sm">Att.</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={form.landings}
                                        onChange={(e) => updateField("landings", parseInt(e.target.value) || 0)}
                                        className="bg-slate-50 border-slate-200 focus:ring-[#774BBE]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* Section 2: Personnel */}
                    <div className="space-y-4">
                        <h3 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider">
                            Personnel
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-600 text-sm">Fonction</Label>
                                <Select
                                    value={form.fonction}
                                    onValueChange={(val) => updateField("fonction", val as pilotFunction)}
                                >
                                    <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-[#774BBE]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FUNCTION_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {form.fonction === "EP" && (
                                <div className="space-y-2">
                                    <Label className="text-slate-600 text-sm">Instructeur</Label>
                                    <Select
                                        value={form.instructorID}
                                        onValueChange={(val) => updateField("instructorID", val)}
                                    >
                                        <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-[#774BBE]">
                                            <SelectValue placeholder="Selectionner" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {instructors.map((u) => (
                                                <SelectItem key={u.id} value={u.id}>
                                                    {u.firstName} {u.lastName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {form.fonction === "I" && (
                                <div className="space-y-2">
                                    <Label className="text-slate-600 text-sm">Eleve</Label>
                                    <Select
                                        value={form.studentID}
                                        onValueChange={(val) => updateField("studentID", val)}
                                    >
                                        <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-[#774BBE]">
                                            <SelectValue placeholder="Selectionner" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {students.map((u) => (
                                                <SelectItem key={u.id} value={u.id}>
                                                    {u.firstName} {u.lastName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* Section 3: Aerodromes */}
                    <div className="space-y-4">
                        <h3 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider">
                            Aerodromes
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-600 text-sm">Depart (OACI)</Label>
                                <Input
                                    value={form.departure}
                                    onChange={(e) => updateField("departure", e.target.value.toUpperCase())}
                                    placeholder="LFXX"
                                    maxLength={4}
                                    className="bg-slate-50 border-slate-200 focus:ring-[#774BBE] uppercase font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-600 text-sm">Arrivee (OACI)</Label>
                                <Input
                                    value={form.arrival}
                                    onChange={(e) => updateField("arrival", e.target.value.toUpperCase())}
                                    placeholder="LFXX"
                                    maxLength={4}
                                    className="bg-slate-50 border-slate-200 focus:ring-[#774BBE] uppercase font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* Section 4: Machine (collapsible) */}
                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={() => setMachineOpen(!machineOpen)}
                            className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors"
                        >
                            Machine
                            {machineOpen ? (
                                <ChevronUp className="w-4 h-4" />
                            ) : (
                                <ChevronDown className="w-4 h-4" />
                            )}
                        </button>

                        {machineOpen && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-600 text-sm">Hobbs deb.</Label>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            value={form.hobbsStart}
                                            onChange={(e) => updateField("hobbsStart", e.target.value)}
                                            className="bg-slate-50 border-slate-200 focus:ring-[#774BBE]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-600 text-sm">Hobbs fin</Label>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            value={form.hobbsEnd}
                                            onChange={(e) => updateField("hobbsEnd", e.target.value)}
                                            className="bg-slate-50 border-slate-200 focus:ring-[#774BBE]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-600 text-sm">Carburant (L)</Label>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            value={form.fuel}
                                            onChange={(e) => updateField("fuel", e.target.value)}
                                            className="bg-slate-50 border-slate-200 focus:ring-[#774BBE]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-600 text-sm">Huile (L)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={form.oil}
                                            onChange={(e) => updateField("oil", e.target.value)}
                                            className="bg-slate-50 border-slate-200 focus:ring-[#774BBE]"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-600 text-sm">Anomalies</Label>
                                    <Textarea
                                        value={form.anomalies}
                                        onChange={(e) => updateField("anomalies", e.target.value)}
                                        placeholder="RAS"
                                        className="bg-slate-50 border-slate-200 focus:border-[#774BBE] min-h-[60px] text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* Section 5: Remarques */}
                    <div className="space-y-4">
                        <h3 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider">
                            Remarques
                        </h3>
                        <Textarea
                            value={form.remarks}
                            onChange={(e) => updateField("remarks", e.target.value)}
                            placeholder="Remarques..."
                            className="bg-slate-50 border-slate-200 focus:border-[#774BBE] min-h-[60px] text-sm"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-4 sm:p-6 border-t border-slate-100 flex flex-col gap-4 flex-shrink-0 rounded-b-xl sm:rounded-b-2xl">
                    {error && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md text-sm">
                            <span>{error}</span>
                        </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-row justify-end gap-3 sm:gap-0">
                        <Button
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                            className="text-slate-500 hover:text-slate-700 hover:bg-slate-200 w-full sm:w-auto"
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={onConfirm}
                            disabled={loading}
                            className="bg-[#774BBE] hover:bg-[#6538a5] text-white w-full sm:min-w-[140px] sm:w-auto"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2 justify-center">
                                    <Spinner size="small" className="w-4 h-4 text-white" />
                                    <span>Creation...</span>
                                </div>
                            ) : (
                                "Enregistrer"
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default NewFlightLogDialog;
