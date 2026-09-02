"use server";

import { randomUUID } from "crypto";
import { MaintenanceTask } from "@prisma/client";
import prisma from "../prisma";
import { requireAuth } from "./users";
import { canAccessMaintenance } from "@/lib/planeVisibility";
import { isPlaneOverdue } from "@/lib/maintenance";
import {
    InterventionInput,
    interventionInputSchema,
    MaintenanceIntervention,
    parseMaintenanceHistory,
    TaskInput,
    taskInputSchema,
} from "@/schemas/maintenance";

// Charge une machine et vérifie que l'utilisateur courant a accès à sa
// maintenance (même club + règle privé/club). Renvoie soit { plane, auth },
// soit { error }.
const loadPlaneForMaintenance = async (planeID: string) => {
    const auth = await requireAuth();
    if ("error" in auth) return { error: auth.error };

    const plane = await prisma.planes.findUnique({ where: { id: planeID } });
    if (!plane || plane.clubID !== auth.user.clubID) {
        return { error: "Machine introuvable" };
    }
    if (!canAccessMaintenance(plane, auth.user)) {
        return { error: "Permissions insuffisantes" };
    }
    return { plane, auth };
};

// ─── Lecture ───

export const getPlaneMaintenance = async (planeID: string) => {
    const loaded = await loadPlaneForMaintenance(planeID);
    if ("error" in loaded) return { error: loaded.error };

    const tasks = await prisma.maintenanceTask.findMany({
        where: { planeId: planeID },
        orderBy: { createdAt: "asc" },
    });

    return {
        success: true as const,
        interventions: parseMaintenanceHistory(loaded.plane.maintenanceHistory),
        tasks,
        hobbsTotal: loaded.plane.hobbsTotal,
    };
};

// ─── Interventions (historique JSON sur la machine) ───

export const addMaintenanceIntervention = async (
    planeID: string,
    input: InterventionInput
) => {
    const parsed = interventionInputSchema.safeParse(input);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Saisie invalide" };
    }
    const data = parsed.data;

    const loaded = await loadPlaneForMaintenance(planeID);
    if ("error" in loaded) return { error: loaded.error };
    const { plane, auth } = loaded;

    const intervention: MaintenanceIntervention = {
        id: randomUUID(),
        date: data.date,
        type: data.type,
        description: data.description,
        // Clé omise si absente : stocker `undefined` peut être rejeté par Prisma,
        // et stocker `null` casserait la relecture (schéma `comment` optionnel,
        // pas nullable).
        ...(data.comment ? { comment: data.comment } : {}),
        engineHours: data.engineHours,
        createdById: auth.user.id,
        createdByName: `${auth.user.firstName} ${auth.user.lastName}`.trim(),
        createdAt: new Date().toISOString(),
    };

    const history = parseMaintenanceHistory(plane.maintenanceHistory);
    const nextHistory = [...history, intervention];

    try {
        await prisma.$transaction(async (tx) => {
            await tx.planes.update({
                where: { id: planeID },
                data: { maintenanceHistory: nextHistory },
            });

            // Association à un rappel : l'intervention clôture le rappel et
            // réinitialise son compteur (date + heures moteur de l'intervention,
            // à défaut l'heure moteur courante de la machine).
            if (data.taskID) {
                const task = await tx.maintenanceTask.findUnique({
                    where: { id: data.taskID },
                });
                if (task && task.planeId === planeID) {
                    await tx.maintenanceTask.update({
                        where: { id: data.taskID },
                        data: {
                            lastPerformedDate: new Date(data.date),
                            lastPerformedHobbs: data.engineHours ?? plane.hobbsTotal ?? task.lastPerformedHobbs,
                            updatedAt: new Date(),
                        },
                    });
                }
            }
        });

        return { success: "Intervention ajoutée", interventions: nextHistory };
    } catch {
        return { error: "Erreur lors de l'ajout de l'intervention" };
    }
};

export const updateMaintenanceIntervention = async (
    planeID: string,
    interventionID: string,
    input: InterventionInput
) => {
    const parsed = interventionInputSchema.safeParse(input);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Saisie invalide" };
    }
    const data = parsed.data;

    const loaded = await loadPlaneForMaintenance(planeID);
    if ("error" in loaded) return { error: loaded.error };
    const { plane } = loaded;

    const history = parseMaintenanceHistory(plane.maintenanceHistory);
    const index = history.findIndex((i) => i.id === interventionID);
    if (index === -1) return { error: "Intervention introuvable" };
    const existing = history[index];

    // On ne touche pas à l'auteur / la date de saisie d'origine : seuls les
    // champs saisis par l'utilisateur sont modifiables. Pas de ré-association à
    // un rappel ici (contrairement à l'ajout) pour éviter de réinitialiser un
    // compteur par effet de bord lors d'une simple correction.
    const updated: MaintenanceIntervention = {
        id: existing.id,
        date: data.date,
        type: data.type,
        description: data.description,
        ...(data.comment ? { comment: data.comment } : {}),
        engineHours: data.engineHours,
        createdById: existing.createdById,
        createdByName: existing.createdByName,
        createdAt: existing.createdAt,
    };

    const nextHistory = [...history];
    nextHistory[index] = updated;

    try {
        await prisma.planes.update({
            where: { id: planeID },
            data: { maintenanceHistory: nextHistory },
        });
        return { success: "Intervention mise à jour", interventions: nextHistory };
    } catch {
        return { error: "Erreur lors de la mise à jour de l'intervention" };
    }
};

export const deleteMaintenanceIntervention = async (
    planeID: string,
    interventionID: string
) => {
    const loaded = await loadPlaneForMaintenance(planeID);
    if ("error" in loaded) return { error: loaded.error };
    const { plane } = loaded;

    const history = parseMaintenanceHistory(plane.maintenanceHistory);
    const nextHistory = history.filter((i) => i.id !== interventionID);
    if (nextHistory.length === history.length) {
        return { error: "Intervention introuvable" };
    }

    try {
        await prisma.planes.update({
            where: { id: planeID },
            data: { maintenanceHistory: nextHistory },
        });
        return { success: "Intervention supprimée", interventions: nextHistory };
    } catch {
        return { error: "Erreur lors de la suppression" };
    }
};

// ─── Rappels récurrents (table MaintenanceTask) ───

export const addMaintenanceTask = async (planeID: string, input: TaskInput) => {
    const parsed = taskInputSchema.safeParse(input);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Saisie invalide" };
    }
    const data = parsed.data;

    const loaded = await loadPlaneForMaintenance(planeID);
    if ("error" in loaded) return { error: loaded.error };

    try {
        const now = new Date();
        const task = await prisma.maintenanceTask.create({
            data: {
                id: randomUUID(),
                updatedAt: now,
                title: data.title,
                intervalHours: data.intervalHours,
                intervalMonths: data.intervalMonths,
                lastPerformedDate: new Date(data.lastPerformedDate),
                lastPerformedHobbs: data.lastPerformedHobbs,
                planeId: planeID,
            },
        });
        return { success: "Rappel créé", task };
    } catch {
        return { error: "Erreur lors de la création du rappel" };
    }
};

export const updateMaintenanceTask = async (taskID: string, input: TaskInput) => {
    const parsed = taskInputSchema.safeParse(input);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Saisie invalide" };
    }
    const data = parsed.data;

    const existing = await prisma.maintenanceTask.findUnique({ where: { id: taskID } });
    if (!existing) return { error: "Rappel introuvable" };

    const loaded = await loadPlaneForMaintenance(existing.planeId);
    if ("error" in loaded) return { error: loaded.error };

    try {
        const task = await prisma.maintenanceTask.update({
            where: { id: taskID },
            data: {
                title: data.title,
                intervalHours: data.intervalHours,
                intervalMonths: data.intervalMonths,
                lastPerformedDate: new Date(data.lastPerformedDate),
                lastPerformedHobbs: data.lastPerformedHobbs,
                updatedAt: new Date(),
            },
        });
        return { success: "Rappel mis à jour", task };
    } catch {
        return { error: "Erreur lors de la mise à jour du rappel" };
    }
};

export const deleteMaintenanceTask = async (taskID: string) => {
    const existing = await prisma.maintenanceTask.findUnique({ where: { id: taskID } });
    if (!existing) return { error: "Rappel introuvable" };

    const loaded = await loadPlaneForMaintenance(existing.planeId);
    if ("error" in loaded) return { error: loaded.error };

    try {
        await prisma.maintenanceTask.delete({ where: { id: taskID } });
        return { success: "Rappel supprimé" };
    } catch {
        return { error: "Erreur lors de la suppression du rappel" };
    }
};

// ─── Alertes (bulle de notification onglet Avions) ───

/**
 * Nombre de machines (parmi celles dont l'utilisateur voit la maintenance) ayant
 * au moins un rappel en retard, et la liste de leurs IDs. Sert à la bulle de
 * notification et au surlignage dans la modale.
 */
export const getMaintenanceAlerts = async (clubID: string) => {
    const auth = await requireAuth();
    if ("error" in auth) return { count: 0, overduePlaneIDs: [] as string[] };
    if (auth.user.clubID !== clubID) return { count: 0, overduePlaneIDs: [] as string[] };

    try {
        const planes = await prisma.planes.findMany({ where: { clubID } });
        const visible = planes.filter((p) => canAccessMaintenance(p, auth.user));
        if (visible.length === 0) return { count: 0, overduePlaneIDs: [] as string[] };

        const tasks = await prisma.maintenanceTask.findMany({
            where: { planeId: { in: visible.map((p) => p.id) } },
        });
        const tasksByPlane = new Map<string, MaintenanceTask[]>();
        for (const t of tasks) {
            const arr = tasksByPlane.get(t.planeId);
            if (arr) arr.push(t);
            else tasksByPlane.set(t.planeId, [t]);
        }

        const now = new Date();
        const overduePlaneIDs = visible
            .filter((p) => isPlaneOverdue(tasksByPlane.get(p.id) ?? [], p.hobbsTotal ?? null, now))
            .map((p) => p.id);

        return { count: overduePlaneIDs.length, overduePlaneIDs };
    } catch {
        return { count: 0, overduePlaneIDs: [] as string[] };
    }
};
