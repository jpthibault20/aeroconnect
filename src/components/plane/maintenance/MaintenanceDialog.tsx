"use client";

import React, { useCallback, useEffect, useState } from "react";
import { MaintenanceTask, planes } from "@prisma/client";
import { pdf } from "@react-pdf/renderer";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/SpinnerVariants";
import AlertConfirmDeleted from "@/components/AlertConfirmDeleted";
import { Wrench, Plus, FileDown, Bell, History, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
    getPlaneMaintenance,
    deleteMaintenanceIntervention,
    deleteMaintenanceTask,
} from "@/api/db/maintenance";
import { MaintenanceIntervention } from "@/schemas/maintenance";
import {
    getTaskDueStatus,
    sortInterventionsDesc,
    sortTasksByUrgency,
    type MaintenanceDueStatus,
} from "@/lib/maintenance";
import { MaintenanceDocument } from "@/components/pdf/exportMaintenance";
import { cn } from "@/lib/utils";
import { MAINTENANCE_ALERTS_EVENT } from "@/lib/maintenanceEvents";
import ReminderForm from "./ReminderForm";
import InterventionForm from "./InterventionForm";

interface Props {
    plane: planes;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const formatDate = (date: string | Date): string =>
    new Date(date).toLocaleDateString("fr-FR");

const describeInterval = (task: MaintenanceTask): string => {
    const parts: string[] = [];
    if (task.intervalHours != null) parts.push(`${task.intervalHours} h`);
    if (task.intervalMonths != null) parts.push(`${task.intervalMonths} mois`);
    return parts.join(" / ");
};

// Marge restante (ou dépassement) borne par borne : un rappel peut être dépassé
// en heures moteur tout en restant dans les temps sur la borne calendaire.
const describeRemaining = (due: MaintenanceDueStatus): string => {
    const parts: string[] = [];
    if (due.hoursRemaining != null) {
        parts.push(
            due.hoursRemaining < 0
                ? `${Math.abs(due.hoursRemaining).toFixed(1)} h de dépassement`
                : `${due.hoursRemaining.toFixed(1)} h restantes`
        );
    }
    if (due.daysRemaining != null) {
        parts.push(
            due.daysRemaining < 0
                ? `${Math.abs(due.daysRemaining)} j de dépassement`
                : `${due.daysRemaining} j restants`
        );
    }
    return parts.join(" · ");
};

type Tab = "interventions" | "reminders";

const MaintenanceDialog = ({ plane, open, onOpenChange }: Props) => {
    const [tab, setTab] = useState<Tab>("interventions");
    const [loading, setLoading] = useState(true);
    const [interventions, setInterventions] = useState<MaintenanceIntervention[]>([]);
    const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
    const [hobbsTotal, setHobbsTotal] = useState<number | null>(plane.hobbsTotal ?? null);
    const [showInterventionForm, setShowInterventionForm] = useState(false);
    const [showReminderForm, setShowReminderForm] = useState(false);
    const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
    const [editingIntervention, setEditingIntervention] = useState<MaintenanceIntervention | null>(null);
    const [exporting, setExporting] = useState(false);
    // ID en cours de suppression : pilote le `loading` d'AlertConfirmDeleted (qui
    // se referme sur la transition true → false).
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const notifyAlertsChanged = useCallback(() => {
        window.dispatchEvent(new Event(MAINTENANCE_ALERTS_EVENT));
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await getPlaneMaintenance(plane.id);
        if ("error" in res) {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
            setLoading(false);
            return;
        }
        setInterventions(res.interventions);
        setTasks(res.tasks);
        setHobbsTotal(res.hobbsTotal ?? null);
        setLoading(false);
    }, [plane.id]);

    useEffect(() => {
        if (open) {
            void load();
            setTab("interventions");
            setShowInterventionForm(false);
            setShowReminderForm(false);
            setEditingTask(null);
            setEditingIntervention(null);
        }
    }, [open, load]);

    // Changer d'onglet referme le formulaire en cours : chaque onglet ne pilote
    // que ses propres saisies.
    const switchTab = (next: Tab) => {
        setTab(next);
        setShowInterventionForm(false);
        setShowReminderForm(false);
        setEditingTask(null);
        setEditingIntervention(null);
    };

    const handleInterventionSaved = (next: MaintenanceIntervention[]) => {
        const wasEditing = editingIntervention != null;
        setInterventions(next);
        setShowInterventionForm(false);
        setEditingIntervention(null);
        // Une intervention peut avoir clôturé un rappel : on recharge les tâches.
        void load();
        notifyAlertsChanged();
        toast({
            title: wasEditing ? "Intervention mise à jour" : "Intervention ajoutée",
            className: "bg-green-600 text-white border-none",
        });
    };

    const handleTaskSaved = (task: MaintenanceTask) => {
        setTasks((prev) => {
            const exists = prev.some((t) => t.id === task.id);
            return exists ? prev.map((t) => (t.id === task.id ? task : t)) : [...prev, task];
        });
        setShowReminderForm(false);
        setEditingTask(null);
        notifyAlertsChanged();
        toast({ title: "Rappel enregistré", className: "bg-green-600 text-white border-none" });
    };

    const handleDeleteIntervention = async (interventionID: string) => {
        setDeletingId(interventionID);
        try {
            const res = await deleteMaintenanceIntervention(plane.id, interventionID);
            if ("error" in res) {
                toast({ title: "Erreur", description: res.error, variant: "destructive" });
            } else if (res.interventions) {
                setInterventions(res.interventions);
                toast({ title: "Intervention supprimée", className: "bg-slate-800 text-white border-none" });
            }
        } finally {
            setDeletingId(null);
        }
    };

    const handleDeleteTask = async (taskID: string) => {
        setDeletingId(taskID);
        try {
            const res = await deleteMaintenanceTask(taskID);
            if ("error" in res) {
                toast({ title: "Erreur", description: res.error, variant: "destructive" });
            } else {
                setTasks((prev) => prev.filter((t) => t.id !== taskID));
                notifyAlertsChanged();
                toast({ title: "Rappel supprimé", className: "bg-slate-800 text-white border-none" });
            }
        } finally {
            setDeletingId(null);
        }
    };

    const handleExportPDF = async () => {
        setExporting(true);
        try {
            const blob = await pdf(
                <MaintenanceDocument
                    planeName={plane.name}
                    planeRegistration={plane.immatriculation}
                    hobbsTotal={hobbsTotal}
                    interventions={sortInterventionsDesc(interventions)}
                    tasks={tasks}
                    generatedAt={new Date()}
                />
            ).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `maintenance_${plane.immatriculation}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch {
            toast({ title: "Erreur lors de l'export PDF", variant: "destructive" });
        } finally {
            setExporting(false);
        }
    };

    const now = new Date();
    const sortedInterventions = sortInterventionsDesc(interventions);
    const sortedTasks = sortTasksByUrgency(tasks, hobbsTotal, now);
    const interventionFormOpen = showInterventionForm || editingIntervention != null;
    const reminderFormOpen = showReminderForm || editingTask != null;

    const tabClass = (active: boolean) =>
        cn(
            "flex-1 sm:flex-none justify-center gap-1.5 rounded-md",
            active
                ? "bg-white text-[#774BBE] shadow-sm hover:bg-white hover:text-[#774BBE]"
                : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
        );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95%] sm:max-w-[720px] p-0 gap-0 bg-white rounded-xl sm:rounded-2xl border-none shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
                {/* Header */}
                <div className="bg-slate-50 p-6 pr-12 border-b border-slate-100 flex-shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <div className="p-2 bg-purple-100 text-[#774BBE] rounded-lg flex-shrink-0">
                                <Wrench className="w-5 h-5" />
                            </div>
                            <span className="min-w-0 break-words">Maintenance — {plane.name}</span>
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 ml-11">
                            {plane.immatriculation} · {hobbsTotal != null ? `${hobbsTotal.toFixed(1)} h moteur` : "heures moteur inconnues"}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Onglets + export */}
                <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2 flex-shrink-0">
                    <div role="tablist" className="flex flex-1 sm:flex-none gap-1 rounded-lg bg-slate-100 p-1">
                        <Button
                            size="sm"
                            variant="ghost"
                            role="tab"
                            aria-selected={tab === "interventions"}
                            onClick={() => switchTab("interventions")}
                            className={tabClass(tab === "interventions")}
                        >
                            <Wrench className="w-4 h-4" /> Interventions
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            role="tab"
                            aria-selected={tab === "reminders"}
                            onClick={() => switchTab("reminders")}
                            className={tabClass(tab === "reminders")}
                        >
                            <Bell className="w-4 h-4" /> Rappels
                        </Button>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleExportPDF}
                        disabled={exporting}
                        className="border-slate-200 text-slate-700 ml-auto"
                    >
                        {exporting ? <Spinner className="w-4 h-4 mr-1" /> : <FileDown className="w-4 h-4 mr-1" />}
                        Export PDF
                    </Button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Spinner className="w-6 h-6 text-[#774BBE]" />
                        </div>
                    ) : tab === "interventions" ? (
                        interventionFormOpen ? (
                            <InterventionForm
                                planeID={plane.id}
                                currentHobbs={hobbsTotal}
                                tasks={tasks}
                                intervention={editingIntervention ?? undefined}
                                onSaved={handleInterventionSaved}
                                onCancel={() => { setShowInterventionForm(false); setEditingIntervention(null); }}
                            />
                        ) : (
                            <>
                                {/* Rappels à venir : rappel en lecture seule, l'édition se fait
                                    dans l'onglet « Rappels ». */}
                                <section className="space-y-3">
                                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <Bell className="w-3.5 h-3.5" /> Rappels à venir
                                    </h3>
                                    {sortedTasks.length === 0 ? (
                                        <p className="text-sm text-slate-400">
                                            Aucun rappel configuré.{" "}
                                            <button
                                                type="button"
                                                onClick={() => switchTab("reminders")}
                                                className="text-[#774BBE] font-medium hover:underline"
                                            >
                                                En créer un
                                            </button>
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {sortedTasks.map((task) => {
                                                const due = getTaskDueStatus(task, hobbsTotal, now);
                                                return (
                                                    <div
                                                        key={task.id}
                                                        className={cn(
                                                            "rounded-xl border p-3",
                                                            due.overdue ? "border-red-200 bg-red-50/60" : "border-slate-200 bg-white"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium text-slate-800 truncate">{task.title}</span>
                                                            {due.overdue && (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 rounded-full px-2 py-0.5 flex-shrink-0">
                                                                    <AlertTriangle className="w-3 h-3" /> En retard
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            Prochaine échéance :{" "}
                                                            {due.nextDueHobbs != null && `${due.nextDueHobbs.toFixed(1)} h`}
                                                            {due.nextDueHobbs != null && due.nextDueDate != null && " · "}
                                                            {due.nextDueDate != null && formatDate(due.nextDueDate)}
                                                        </p>
                                                        {describeRemaining(due) && (
                                                            <p className={cn("text-xs mt-0.5", due.overdue ? "text-red-600" : "text-slate-400")}>
                                                                {describeRemaining(due)}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </section>

                                {/* Historique des interventions */}
                                <section className="space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <History className="w-3.5 h-3.5" /> Interventions réalisées
                                        </h3>
                                        <Button
                                            size="sm"
                                            onClick={() => setShowInterventionForm(true)}
                                            className="bg-[#774BBE] hover:bg-[#6538a5] text-white flex-shrink-0"
                                        >
                                            <Plus className="w-4 h-4 mr-1" /> Nouvelle intervention
                                        </Button>
                                    </div>
                                    {sortedInterventions.length === 0 ? (
                                        <p className="text-sm text-slate-400">Aucune intervention enregistrée.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {sortedInterventions.map((it) => (
                                                <div key={it.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-sm font-medium text-slate-800">{it.description}</span>
                                                            <span className="inline-flex items-center text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2 py-0.5">
                                                                {it.type}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            {formatDate(it.date)}
                                                            {it.engineHours != null && ` · ${it.engineHours.toFixed(1)} h moteur`}
                                                            {` · ${it.createdByName}`}
                                                        </p>
                                                        {it.comment && (
                                                            <p className="text-xs text-slate-400 mt-1 italic">{it.comment}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-slate-500 hover:text-[#774BBE]"
                                                            onClick={() => setEditingIntervention(it)}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <AlertConfirmDeleted
                                                            title="Supprimer cette intervention ?"
                                                            description="Cette action est irréversible."
                                                            cancel="Annuler"
                                                            confirm="Supprimer"
                                                            confirmAction={() => handleDeleteIntervention(it.id)}
                                                            loading={deletingId === it.id}
                                                        >
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </AlertConfirmDeleted>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </>
                        )
                    ) : reminderFormOpen ? (
                        <ReminderForm
                            planeID={plane.id}
                            currentHobbs={hobbsTotal}
                            task={editingTask ?? undefined}
                            onSaved={handleTaskSaved}
                            onCancel={() => { setShowReminderForm(false); setEditingTask(null); }}
                        />
                    ) : (
                        /* Onglet Rappels : liste éditable */
                        <section className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Bell className="w-3.5 h-3.5" /> Rappels d&apos;entretien
                                </h3>
                                <Button
                                    size="sm"
                                    onClick={() => setShowReminderForm(true)}
                                    className="bg-[#774BBE] hover:bg-[#6538a5] text-white flex-shrink-0"
                                >
                                    <Plus className="w-4 h-4 mr-1" /> Nouveau rappel
                                </Button>
                            </div>
                            {sortedTasks.length === 0 ? (
                                <p className="text-sm text-slate-400">Aucun rappel configuré.</p>
                            ) : (
                                <div className="space-y-2">
                                    {sortedTasks.map((task) => {
                                        const due = getTaskDueStatus(task, hobbsTotal, now);
                                        return (
                                            <div
                                                key={task.id}
                                                className={cn(
                                                    "flex items-center justify-between gap-3 rounded-xl border p-3",
                                                    due.overdue ? "border-red-200 bg-red-50/60" : "border-slate-200 bg-white"
                                                )}
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-slate-800 truncate">{task.title}</span>
                                                        {due.overdue && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 rounded-full px-2 py-0.5 flex-shrink-0">
                                                                <AlertTriangle className="w-3 h-3" /> En retard
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        Tous les {describeInterval(task)} · dernière : {formatDate(task.lastPerformedDate)} à {task.lastPerformedHobbs.toFixed(1)} h
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        Prochaine échéance :{" "}
                                                        {due.nextDueHobbs != null && `${due.nextDueHobbs.toFixed(1)} h`}
                                                        {due.nextDueHobbs != null && due.nextDueDate != null && " · "}
                                                        {due.nextDueDate != null && formatDate(due.nextDueDate)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-500 hover:text-[#774BBE]"
                                                        onClick={() => setEditingTask(task)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <AlertConfirmDeleted
                                                        title={`Supprimer le rappel « ${task.title} » ?`}
                                                        description="Cette action est irréversible."
                                                        cancel="Annuler"
                                                        confirm="Supprimer"
                                                        confirmAction={() => handleDeleteTask(task.id)}
                                                        loading={deletingId === task.id}
                                                    >
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </AlertConfirmDeleted>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default MaintenanceDialog;
