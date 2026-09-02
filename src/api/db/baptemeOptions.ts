"use server";

import prisma from "../prisma";
import { requireAuth } from "./users";
import { canManageBaptemeOptions } from "@/lib/bapteme";
import { baptemeOptionInputSchema, BaptemeOptionInput } from "@/schemas/baptemeOptions";

// Charge une machine et vérifie que l'utilisateur courant peut en gérer les
// formules de baptême (même club, machine du club, rôle de gestion). Renvoie
// soit { plane }, soit { error }.
const loadPlaneForBaptemeOptions = async (planeID: string) => {
    const auth = await requireAuth();
    if ("error" in auth) return { error: auth.error };

    const plane = await prisma.planes.findUnique({ where: { id: planeID } });
    if (!plane || plane.clubID !== auth.user.clubID) {
        return { error: "Machine introuvable" };
    }
    if (!canManageBaptemeOptions(plane, auth.user)) {
        return { error: "Permissions insuffisantes" };
    }
    return { plane };
};

export const getPlaneBaptemeOptions = async (planeID: string) => {
    const loaded = await loadPlaneForBaptemeOptions(planeID);
    if ("error" in loaded) return { error: loaded.error };

    const options = await prisma.baptemeOption.findMany({
        where: { planeId: planeID },
        orderBy: { durationMin: "asc" },
    });
    return { success: true as const, options };
};

export const addBaptemeOption = async (planeID: string, input: BaptemeOptionInput) => {
    const parsed = baptemeOptionInputSchema.safeParse(input);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Saisie invalide" };
    }

    const loaded = await loadPlaneForBaptemeOptions(planeID);
    if ("error" in loaded) return { error: loaded.error };

    try {
        const option = await prisma.baptemeOption.create({
            data: {
                durationMin: parsed.data.durationMin,
                price: parsed.data.price,
                planeId: planeID,
            },
        });
        return { success: "Formule créée", option };
    } catch {
        return { error: "Erreur lors de la création de la formule" };
    }
};

export const updateBaptemeOption = async (optionID: string, input: BaptemeOptionInput) => {
    const parsed = baptemeOptionInputSchema.safeParse(input);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Saisie invalide" };
    }

    const existing = await prisma.baptemeOption.findUnique({ where: { id: optionID } });
    if (!existing) return { error: "Formule introuvable" };

    const loaded = await loadPlaneForBaptemeOptions(existing.planeId);
    if ("error" in loaded) return { error: loaded.error };

    try {
        const option = await prisma.baptemeOption.update({
            where: { id: optionID },
            data: { durationMin: parsed.data.durationMin, price: parsed.data.price },
        });
        return { success: "Formule mise à jour", option };
    } catch {
        return { error: "Erreur lors de la mise à jour de la formule" };
    }
};

export const deleteBaptemeOption = async (optionID: string) => {
    const existing = await prisma.baptemeOption.findUnique({ where: { id: optionID } });
    if (!existing) return { error: "Formule introuvable" };

    const loaded = await loadPlaneForBaptemeOptions(existing.planeId);
    if ("error" in loaded) return { error: loaded.error };

    try {
        await prisma.baptemeOption.delete({ where: { id: optionID } });
        return { success: "Formule supprimée" };
    } catch {
        return { error: "Erreur lors de la suppression de la formule" };
    }
};
