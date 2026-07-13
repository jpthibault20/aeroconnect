"use client";

import React, { useState } from "react";
import { MaintenanceTask } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/SpinnerVariants";
import { IoIosWarning } from "react-icons/io";
import { addMaintenanceTask, updateMaintenanceTask } from "@/api/db/maintenance";
import { TaskInput } from "@/schemas/maintenance";

interface Props {
    planeID: string;
    currentHobbs: number | null;
    // Rappel à éditer ; absent => création.
    task?: MaintenanceTask;
    onSaved: (task: MaintenanceTask) => void;
    onCancel: () => void;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const ReminderForm = ({ planeID, currentHobbs, task, onSaved, onCancel }: Props) => {
    const [title, setTitle] = useState(task?.title ?? "");
    const [intervalHours, setIntervalHours] = useState<string>(
        task?.intervalHours != null ? String(task.intervalHours) : ""
    );
    const [intervalMonths, setIntervalMonths] = useState<string>(
        task?.intervalMonths != null ? String(task.intervalMonths) : ""
    );
    const [lastDate, setLastDate] = useState<string>(
        task ? new Date(task.lastPerformedDate).toISOString().slice(0, 10) : todayISO()
    );
    const [lastHobbs, setLastHobbs] = useState<string>(
        task ? String(task.lastPerformedHobbs) : currentHobbs != null ? String(currentHobbs) : "0"
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const onSubmit = async () => {
        setError("");
        const input: TaskInput = {
            title: title.trim(),
            intervalHours: intervalHours ? parseFloat(intervalHours) : null,
            intervalMonths: intervalMonths ? parseInt(intervalMonths, 10) : null,
            lastPerformedDate: lastDate,
            lastPerformedHobbs: lastHobbs ? parseFloat(lastHobbs) : 0,
        };
        if (!input.title) return setError("Intitulé requis");
        if (input.intervalHours == null && input.intervalMonths == null) {
            return setError("Renseignez une périodicité en heures et/ou en mois");
        }

        setLoading(true);
        try {
            const res = task
                ? await updateMaintenanceTask(task.id, input)
                : await addMaintenanceTask(planeID, input);
            if ("error" in res) {
                setError(res.error ?? "Une erreur est survenue");
            } else if (res.task) {
                onSaved(res.task);
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
                {task ? "Modifier le rappel" : "Nouveau rappel d'entretien"}
            </h4>

            <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Intitulé de la tâche</Label>
                <Input
                    value={title}
                    disabled={loading}
                    placeholder="Ex. Révision 100h, Visite annuelle…"
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-white border-slate-200"
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Toutes les (heures moteur)</Label>
                    <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={intervalHours}
                        disabled={loading}
                        placeholder="Ex. 50"
                        onChange={(e) => setIntervalHours(e.target.value)}
                        className="bg-white border-slate-200 font-mono"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Tous les (mois)</Label>
                    <Input
                        type="number"
                        min="0"
                        value={intervalMonths}
                        disabled={loading}
                        placeholder="Ex. 12"
                        onChange={(e) => setIntervalMonths(e.target.value)}
                        className="bg-white border-slate-200 font-mono"
                    />
                </div>
            </div>
            <p className="text-xs text-slate-400">
                Renseignez au moins l&apos;une des deux périodicités. La première échéance atteinte
                déclenche l&apos;alerte de retard.
            </p>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Dernière réalisation</Label>
                    <Input
                        type="date"
                        value={lastDate}
                        disabled={loading}
                        onChange={(e) => setLastDate(e.target.value)}
                        className="bg-white border-slate-200"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">à (heures moteur)</Label>
                    <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={lastHobbs}
                        disabled={loading}
                        onChange={(e) => setLastHobbs(e.target.value)}
                        className="bg-white border-slate-200 font-mono"
                    />
                </div>
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
                    {loading ? <Spinner className="text-white w-4 h-4" /> : task ? "Enregistrer" : "Créer"}
                </Button>
            </div>
        </div>
    );
};

export default ReminderForm;
