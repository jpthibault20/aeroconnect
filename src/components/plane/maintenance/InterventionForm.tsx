"use client";

import React, { useState } from "react";
import { MaintenanceTask } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/SpinnerVariants";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { IoIosWarning } from "react-icons/io";
import { addMaintenanceIntervention, updateMaintenanceIntervention } from "@/api/db/maintenance";
import {
    InterventionInput,
    MAINTENANCE_TYPES,
    MaintenanceIntervention,
} from "@/schemas/maintenance";

// Libellés FR des types de maintenance.
const TYPE_LABELS: Record<string, string> = {
    VIDANGE: "Vidange",
    REVISION: "Révision",
    REPARATION: "Réparation",
    VISITE_ANNUELLE: "Visite annuelle",
    PESEE: "Pesée",
    AUTRE: "Autre",
};

const NO_TASK = "__none__";

interface Props {
    planeID: string;
    currentHobbs: number | null;
    // Rappels de la machine, proposés en association (l'intervention peut clôturer
    // un rappel et réinitialiser son compteur).
    tasks: MaintenanceTask[];
    // Intervention à éditer ; absente => création.
    intervention?: MaintenanceIntervention;
    onSaved: (interventions: MaintenanceIntervention[]) => void;
    onCancel: () => void;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const InterventionForm = ({ planeID, currentHobbs, tasks, intervention, onSaved, onCancel }: Props) => {
    const [date, setDate] = useState(
        intervention ? new Date(intervention.date).toISOString().slice(0, 10) : todayISO()
    );
    const [type, setType] = useState<string>(intervention?.type ?? MAINTENANCE_TYPES[1]); // REVISION par défaut
    const [description, setDescription] = useState(intervention?.description ?? "");
    const [comment, setComment] = useState(intervention?.comment ?? "");
    const [engineHours, setEngineHours] = useState<string>(
        intervention
            ? intervention.engineHours != null ? String(intervention.engineHours) : ""
            : currentHobbs != null ? String(currentHobbs) : ""
    );
    const [taskID, setTaskID] = useState<string>(NO_TASK);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const onSubmit = async () => {
        setError("");
        if (!description.trim()) return setError("Description requise");

        const input: InterventionInput = {
            date,
            type,
            description: description.trim(),
            comment: comment.trim() || undefined,
            engineHours: engineHours ? parseFloat(engineHours) : null,
            taskID: taskID !== NO_TASK ? taskID : undefined,
        };

        setLoading(true);
        try {
            const res = intervention
                ? await updateMaintenanceIntervention(planeID, intervention.id, input)
                : await addMaintenanceIntervention(planeID, input);
            if ("error" in res) {
                setError(res.error ?? "Une erreur est survenue");
            } else if (res.interventions) {
                onSaved(res.interventions);
            }
        } catch {
            setError("Une erreur inattendue est survenue.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <h4 className="text-sm font-semibold text-slate-800">
                {intervention ? "Modifier l'intervention" : "Nouvelle intervention"}
            </h4>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Date</Label>
                    <Input
                        type="date"
                        value={date}
                        disabled={loading}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-white border-slate-200"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Type</Label>
                    <Select value={type} onValueChange={setType} disabled={loading}>
                        <SelectTrigger className="bg-white border-slate-200">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {MAINTENANCE_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>
                                    {TYPE_LABELS[t] ?? t}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Description</Label>
                <Input
                    value={description}
                    disabled={loading}
                    placeholder="Ce qui a été fait…"
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-white border-slate-200"
                />
            </div>

            {tasks.length > 0 && !intervention ? (
                // Libellés et champs placés en cellules directes de la grille : chaque
                // ligne (libellés puis inputs) s'aligne même si un libellé passe sur
                // deux lignes. `self-end` colle les libellés juste au-dessus des inputs.
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 items-start">
                    <Label className="text-slate-700 font-medium self-end">Heures moteur</Label>
                    <Label className="text-slate-700 font-medium self-end">
                        Marquer un rappel comme effectué{" "}
                        <span className="text-slate-400 font-normal">(facultatif)</span>
                    </Label>

                    <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={engineHours}
                        disabled={loading}
                        placeholder="0.0"
                        onChange={(e) => setEngineHours(e.target.value)}
                        className="bg-white border-slate-200 font-mono"
                    />
                    <Select value={taskID} onValueChange={setTaskID} disabled={loading}>
                        <SelectTrigger className="bg-white border-slate-200">
                            <SelectValue placeholder="Aucun" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={NO_TASK}>Aucun rappel</SelectItem>
                            {tasks.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                    {t.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <p className="col-start-2 text-xs text-slate-400">
                        Réinitialise le compteur du rappel choisi (heures moteur et échéance) à partir de cette intervention.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Heures moteur</Label>
                    <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={engineHours}
                        disabled={loading}
                        placeholder="0.0"
                        onChange={(e) => setEngineHours(e.target.value)}
                        className="bg-white border-slate-200 font-mono"
                    />
                </div>
            )}

            <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Commentaire (optionnel)</Label>
                <Textarea
                    value={comment}
                    disabled={loading}
                    placeholder="Remarques, pièces changées…"
                    onChange={(e) => setComment(e.target.value)}
                    className="bg-white border-slate-200 min-h-[70px]"
                />
            </div>

            {error && (
                <div className="text-red-600 bg-red-50 border border-red-100 p-2.5 rounded-lg flex items-center gap-2 text-sm">
                    <IoIosWarning className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading} className="text-slate-600">
                    Annuler
                </Button>
                <Button
                    size="sm"
                    onClick={onSubmit}
                    disabled={loading}
                    className="bg-[#774BBE] hover:bg-[#6538a5] text-white min-w-[100px]"
                >
                    {loading ? <Spinner className="text-white w-4 h-4" /> : intervention ? "Enregistrer" : "Ajouter"}
                </Button>
            </div>
        </div>
    );
};

export default InterventionForm;
