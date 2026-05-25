"use client";

import React, { useState, useEffect, useMemo } from "react";
import { flight_logs, planes, User, flightNature, instructionSubType, userRole } from "@prisma/client";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { createFlightLog, CreateFlightLogInput, getPlaneHobbs } from "@/api/db/logbook";
import { isInstructorRole, INSTRUCTION_SUBTYPE_LABELS } from "@/lib/logbookCalc";
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
    Minus,
    Plus,
} from "lucide-react";

interface Props {
    planes: planes[];
    users: User[];
    onCreated: (log: flight_logs) => void;
}

const NATURE_OPTIONS: { value: flightNature; label: string }[] = [
    { value: "INSTRUCTION", label: "Instruction" },
    { value: "CDB", label: "Commandant de bord" },
];

const SUBTYPE_OPTIONS: { value: instructionSubType; label: string }[] = [
    { value: "LOCAL", label: INSTRUCTION_SUBTYPE_LABELS.LOCAL },
    { value: "NAVIGATION", label: INSTRUCTION_SUBTYPE_LABELS.NAVIGATION },
    { value: "LACHE", label: INSTRUCTION_SUBTYPE_LABELS.LACHE },
    { value: "BAPTEME", label: INSTRUCTION_SUBTYPE_LABELS.BAPTEME },
    { value: "EXAM", label: INSTRUCTION_SUBTYPE_LABELS.EXAM },
];

interface FormData {
    date: string;
    planeID: string;
    nature: flightNature;
    subType: instructionSubType | "";
    movements: number;
    instructorID: string;
    studentID: string;
    departure: string;
    arrival: string;
    hobbsStart: string;
    hobbsEnd: string;
    fuel: string;
    machineAnomalies: string;
    personalObservation: string;
}

const NewFlightLogDialog = ({ planes: planesList, users, onCreated }: Props) => {
    const { currentUser } = useCurrentUser();
    const { currentClub } = useCurrentClub();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const today = new Date().toISOString().split("T")[0];
    const userIsInstructor = currentUser ? isInstructorRole(currentUser.role) : false;

    const buildInitialForm = (): FormData => ({
        date: today,
        planeID: "",
        nature: "INSTRUCTION",
        subType: "LOCAL",
        movements: 1,
        instructorID: "",
        studentID: "",
        departure: currentClub?.id ?? "",
        arrival: currentClub?.id ?? "",
        hobbsStart: "",
        hobbsEnd: "",
        fuel: "",
        machineAnomalies: "",
        personalObservation: "",
    });

    const [form, setForm] = useState<FormData>(buildInitialForm());

    // Hydrate départ/arrivée avec le code OACI du club (= Club.id par
    // convention) dès qu'il est disponible (cas où currentClub arrive après le
    // mount initial).
    useEffect(() => {
        const code = currentClub?.id;
        if (!code) return;
        setForm((prev) => ({
            ...prev,
            departure: prev.departure || code,
            arrival: prev.arrival || code,
        }));
    }, [currentClub?.id]);

    // Liste des "compagnons" affichés selon la situation : si l'utilisateur
    // connecté est instructeur, on lui demande l'élève ; sinon (élève-pilote),
    // on lui demande l'instructeur.
    const instructors = useMemo(
        () =>
            users.filter(
                (u) =>
                    u.role === userRole.INSTRUCTOR ||
                    u.role === userRole.OWNER ||
                    u.role === userRole.ADMIN
            ),
        [users]
    );
    const students = useMemo(
        () => users.filter((u) => u.role === userRole.STUDENT || u.role === userRole.PILOT),
        [users]
    );

    const showInstructionCompanion = form.nature === "INSTRUCTION";

    // Gating : USER et STUDENT ne peuvent pas créer d'entrée manuelle (côté serveur
    // bloqué par LOGBOOK_WRITE_ROLES, on cache aussi le bouton côté client).
    const canCreate = !currentUser
        || (currentUser.role !== userRole.USER && currentUser.role !== userRole.STUDENT);

    const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    // Pré-remplit hobbsStart avec le hobbsTotal courant de l'avion. Verrouillé
    // côté serveur de toute façon, mais on affiche la valeur pour transparence.
    useEffect(() => {
        if (!form.planeID) {
            updateField("hobbsStart", "");
            return;
        }
        let cancelled = false;
        getPlaneHobbs(form.planeID).then((hobbs) => {
            if (cancelled) return;
            updateField("hobbsStart", hobbs != null ? String(hobbs) : "");
        });
        return () => {
            cancelled = true;
        };
    }, [form.planeID]);

    const resetForm = () => {
        setForm(buildInitialForm());
        setError("");
    };

    const onConfirm = async () => {
        setLoading(true);
        setError("");

        if (!currentUser) {
            setError("Utilisateur non connecté.");
            setLoading(false);
            return;
        }
        if (!form.date) {
            setError("Veuillez saisir une date.");
            setLoading(false);
            return;
        }
        if (!form.planeID) {
            setError("Veuillez sélectionner un aéronef.");
            setLoading(false);
            return;
        }
        if (!form.hobbsEnd || isNaN(parseFloat(form.hobbsEnd))) {
            setError("Les heures moteur de fin sont obligatoires.");
            setLoading(false);
            return;
        }
        if (form.hobbsStart && parseFloat(form.hobbsEnd) <= parseFloat(form.hobbsStart)) {
            setError("Les heures moteur de fin doivent être supérieures à celles de début.");
            setLoading(false);
            return;
        }
        if (form.nature === "INSTRUCTION" && !form.subType) {
            setError("Veuillez sélectionner un sous-type d'instruction.");
            setLoading(false);
            return;
        }
        if (form.nature === "INSTRUCTION") {
            if (userIsInstructor && !form.studentID) {
                setError("Veuillez sélectionner l'élève associé.");
                setLoading(false);
                return;
            }
            if (!userIsInstructor && !form.instructorID) {
                setError("Veuillez sélectionner l'instructeur.");
                setLoading(false);
                return;
            }
        }

        const selectedPlane = planesList.find((p) => p.id === form.planeID);
        if (!selectedPlane) {
            setError("Aéronef introuvable.");
            setLoading(false);
            return;
        }

        // pilotID = utilisateur connecté. La fonction (EP/P/I) est déduite
        // côté serveur à partir de la nature + du rôle de l'utilisateur.
        let instructorID: string | undefined;
        let instructorFirstName: string | undefined;
        let instructorLastName: string | undefined;
        let studentID: string | undefined;
        let studentFirstName: string | undefined;
        let studentLastName: string | undefined;

        if (form.nature === "INSTRUCTION") {
            if (userIsInstructor && form.studentID) {
                const stud = users.find((u) => u.id === form.studentID);
                if (stud) {
                    studentID = stud.id;
                    studentFirstName = stud.firstName ?? undefined;
                    studentLastName = stud.lastName ?? undefined;
                }
            } else if (!userIsInstructor && form.instructorID) {
                const instr = users.find((u) => u.id === form.instructorID);
                if (instr) {
                    instructorID = instr.id;
                    instructorFirstName = instr.firstName;
                    instructorLastName = instr.lastName;
                }
            }
        }

        const input: CreateFlightLogInput = {
            clubID: currentClub?.id ?? currentUser.clubID ?? "",
            date: new Date(form.date),
            planeID: selectedPlane.id,
            planeRegistration: selectedPlane.immatriculation,
            planeName: selectedPlane.name,
            planeClass: selectedPlane.classes,
            pilotID: currentUser.id,
            pilotFirstName: currentUser.firstName,
            pilotLastName: currentUser.lastName,
            instructorID,
            instructorFirstName,
            instructorLastName,
            studentID,
            studentFirstName,
            studentLastName,
            flightNature: form.nature,
            instructionSubType: form.nature === "INSTRUCTION" ? (form.subType as instructionSubType) : null,
            takeoffs: form.movements,
            landings: form.movements,
            departureAirfield: form.departure || undefined,
            arrivalAirfield: form.arrival || undefined,
            hobbsEnd: parseFloat(form.hobbsEnd),
            fuelAdded: form.fuel ? parseFloat(form.fuel) : undefined,
            machineAnomalies: form.machineAnomalies || undefined,
            personalObservation: form.personalObservation || undefined,
            isManualEntry: true,
        };

        try {
            const res = await createFlightLog(input);
            if ("error" in res) {
                setError(res.error ?? "Erreur inconnue");
            } else if (res.log) {
                toast({
                    title: "Entrée créée",
                    description: "L'entrée de carnet a été enregistrée.",
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

    if (!canCreate) return null;

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
                    Nouvelle entrée
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
                            Nouvelle entrée de carnet
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
                                <Label className="text-slate-600 text-sm">Date <span className="text-red-500">*</span></Label>
                                <Input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => updateField("date", e.target.value)}
                                    className="bg-slate-50 border-slate-200 focus:ring-[#774BBE]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-600 text-sm">Aéronef <span className="text-red-500">*</span></Label>
                                <Select
                                    value={form.planeID}
                                    onValueChange={(val) => updateField("planeID", val)}
                                >
                                    <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-[#774BBE]">
                                        <SelectValue placeholder="Sélectionner" />
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-600 text-sm">Nature du vol</Label>
                                <Select
                                    value={form.nature}
                                    onValueChange={(val) => {
                                        const nature = val as flightNature;
                                        updateField("nature", nature);
                                        if (nature === "CDB") {
                                            updateField("subType", "");
                                        } else if (!form.subType) {
                                            updateField("subType", "LOCAL");
                                        }
                                    }}
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

                            {form.nature === "INSTRUCTION" && (
                                <div className="space-y-2">
                                    <Label className="text-slate-600 text-sm">Sous-type <span className="text-red-500">*</span></Label>
                                    <Select
                                        value={form.subType || ""}
                                        onValueChange={(val) => updateField("subType", val as instructionSubType)}
                                    >
                                        <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-[#774BBE]">
                                            <SelectValue placeholder="Sélectionner" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SUBTYPE_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 flex flex-col items-center">
                            <Label className="text-slate-600 text-sm">Atterrissage / Décollage</Label>
                            <div className="inline-flex h-10 items-stretch overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                                <button type="button" disabled={form.movements <= 1} onClick={() => updateField("movements", Math.max(1, form.movements - 1))} className="flex w-10 items-center justify-center text-slate-600 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                                    <Minus className="w-4 h-4" />
                                </button>
                                <div className="flex min-w-[3rem] items-center justify-center border-x border-slate-200 bg-slate-50/60 px-2 text-base font-semibold text-[#774BBE] tabular-nums">
                                    {form.movements}
                                </div>
                                <button type="button" onClick={() => updateField("movements", form.movements + 1)} className="flex w-10 items-center justify-center text-slate-600 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Personnel — visible uniquement pour les vols d'instruction */}
                    {showInstructionCompanion && (
                        <>
                            <div className="h-px bg-slate-100 w-full" />
                            <div className="space-y-4">
                                <h3 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider">
                                    Personnel
                                </h3>

                                {userIsInstructor ? (
                                    <div className="space-y-2">
                                        <Label className="text-slate-600 text-sm">Élève <span className="text-red-500">*</span></Label>
                                        <Select
                                            value={form.studentID}
                                            onValueChange={(val) => updateField("studentID", val)}
                                        >
                                            <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-[#774BBE]">
                                                <SelectValue placeholder="Sélectionner un élève" />
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
                                ) : (
                                    <div className="space-y-2">
                                        <Label className="text-slate-600 text-sm">Instructeur <span className="text-red-500">*</span></Label>
                                        <Select
                                            value={form.instructorID}
                                            onValueChange={(val) => updateField("instructorID", val)}
                                        >
                                            <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-[#774BBE]">
                                                <SelectValue placeholder="Sélectionner un instructeur" />
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
                            </div>
                        </>
                    )}

                    <div className="h-px bg-slate-100 w-full" />

                    {/* Section 3: Aérodromes */}
                    <div className="space-y-4">
                        <h3 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider">
                            Aérodromes
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-600 text-sm">Départ</Label>
                                <Input
                                    value={form.departure}
                                    onChange={(e) => updateField("departure", e.target.value.toUpperCase())}
                                    placeholder="LFXXXX"
                                    maxLength={6}
                                    className="bg-slate-50 border-slate-200 focus:ring-[#774BBE] uppercase font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-600 text-sm">Arrivée</Label>
                                <Input
                                    value={form.arrival}
                                    onChange={(e) => updateField("arrival", e.target.value.toUpperCase())}
                                    placeholder="LFXXXX"
                                    maxLength={6}
                                    className="bg-slate-50 border-slate-200 focus:ring-[#774BBE] uppercase font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* Section 4: Machine */}
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
                                    value={form.hobbsStart}
                                    readOnly
                                    placeholder="—"
                                    className="bg-slate-100 border-slate-200 text-slate-500 cursor-default font-mono"
                                />
                                <p className="text-xs text-slate-400">Lu automatiquement depuis l&apos;aéronef.</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-600 text-sm">Heures moteur fin <span className="text-red-500">*</span></Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={form.hobbsEnd}
                                    onChange={(e) => updateField("hobbsEnd", e.target.value)}
                                    placeholder="0.0"
                                    className="bg-slate-50 border-slate-200 focus:ring-[#774BBE] font-mono"
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label className="text-slate-600 text-sm">Carburant ajouté (L)</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={form.fuel}
                                    onChange={(e) => updateField("fuel", e.target.value)}
                                    placeholder="0.0"
                                    className="bg-slate-50 border-slate-200 focus:ring-[#774BBE]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* Section 5: Observations */}
                    <div className="space-y-4">
                        <h3 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider">
                            Observations
                        </h3>
                        <div className="space-y-2">
                            <Label className="text-slate-600 text-sm">Anomalie machine</Label>
                            <Textarea
                                value={form.machineAnomalies}
                                onChange={(e) => updateField("machineAnomalies", e.target.value)}
                                placeholder="RAS"
                                className="bg-slate-50 border-slate-200 focus:ring-[#774BBE] min-h-[60px] text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-600 text-sm">Observation personnel</Label>
                            <Textarea
                                value={form.personalObservation}
                                onChange={(e) => updateField("personalObservation", e.target.value)}
                                placeholder="Vos observations sur le vol..."
                                className="bg-slate-50 border-slate-200 focus:ring-[#774BBE] min-h-[60px] text-sm"
                            />
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

                    <DialogFooter className="flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
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
                                    <span>Création...</span>
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
