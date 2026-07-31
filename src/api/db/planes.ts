"use server";

import { MachineUsage, planes } from "@prisma/client";
import prisma from "../prisma";
import { requireAuth } from "./users";
import { canEditPlaneHobbs, canManagePlane, filterVisiblePlanes, resolvePlaneCreation, sanitizeClubUsages } from "@/lib/planeVisibility";

export interface CreatePlaneInput {
    clubID: string;
    name: string;
    immatriculation: string;
    classes: number;
    // 'club'  => machine du club (propriétaire = le club, réservé aux rôles de
    //            gestion). 'private' => machine privée du créateur.
    kind: "club" | "private";
    // Usages, uniquement pour une machine du club.
    usageTypes?: MachineUsage[];
}

export const createPlane = async (dataPlane: CreatePlaneInput) => {
    if (!dataPlane.name || !dataPlane.immatriculation || !dataPlane.clubID) {
        return { error: 'Missing required fields' };
    }

    // Tout membre authentifié peut créer une machine SAUF le rôle USER de base.
    const auth = await requireAuth();
    if ('error' in auth) return { error: auth.error };

    if (auth.user.clubID !== dataPlane.clubID) {
        return { error: "Permissions insuffisantes" };
    }

    // Détermination du type de machine + propriétaire (logique pure, testée).
    const resolution = resolvePlaneCreation(auth.user, dataPlane.kind, dataPlane.usageTypes ?? []);
    if ("error" in resolution) {
        return { error: resolution.error };
    }
    const { ownerID, usageTypes } = resolution;

    try {
        // Vérification de l'existence d'un avion avec le même nom ou la même immatriculation
        const existingPlane = await prisma.planes.findFirst({
            where: {
                OR: [
                    { name: dataPlane.name, clubID: dataPlane.clubID },
                    { immatriculation: dataPlane.immatriculation, clubID: dataPlane.clubID },
                ],
            },
        });

        if (existingPlane) {
            return {
                error: 'Un avion existe déjà avec au moins un des champs entrés',
            };
        }

        // Création du nouvel avion si aucun duplicata n'est trouvé
        await prisma.planes.create({
            data: {
                clubID: dataPlane.clubID,
                name: dataPlane.name,
                immatriculation: dataPlane.immatriculation,
                classes: dataPlane.classes,
                ownerID,
                usageTypes,
            },
        });

        // Récupération et retour des avions VISIBLES par le créateur pour ce club
        const planes = await prisma.planes.findMany({
            where: {
                clubID: dataPlane.clubID,
            },
        });

        return { success: 'Avion créé avec succès !', planes: filterVisiblePlanes(planes, auth.user) };

    } catch {
        return {
            error: 'Plane creation failed',
        };
    }
};


export const getPlanes = async (clubID: string) => {
    if (!clubID) {
        return { error: 'Missing clubID' };
    }

    const auth = await requireAuth();
    if ('error' in auth) return [];
    if (auth.user.clubID !== clubID) return [];

    try {
        const planes = await prisma.planes.findMany({
            where: {
                clubID: clubID
            }
        });

        // Masque les machines privées des autres membres.
        return filterVisiblePlanes(planes, auth.user);
    } catch {
        return [];
    }
};

export const deletePlane = async (planeID: string) => {
    if (!planeID) {
        return { error: 'Missing planeID' };
    }

    const auth = await requireAuth();
    if ('error' in auth) return { error: auth.error };

    try {
        const plane = await prisma.planes.findFirst({
            where: { id: planeID }
        });

        if (!plane || plane.clubID !== auth.user.clubID) {
            return { error: 'Plane not found' };
        }

        // Machine du club => rôles de gestion ; machine privée => propriétaire,
        // président ou admin.
        if (!canManagePlane(plane, auth.user)) {
            return { error: "Permissions insuffisantes" };
        }

        await prisma.planes.delete({
            where: { id: planeID }
        });

        return { success: 'Plane deleted successfully' };
    } catch {
        return { error: 'Plane deletion failed' };
    }
};

export const updateOperationalByID = async (planeID: string, operational: boolean) => {
    if (!planeID) {
        return { error: 'Missing planeID' };
    }

    const auth = await requireAuth();
    if ('error' in auth) return { error: auth.error };

    try {
        const existing = await prisma.planes.findUnique({ where: { id: planeID } });
        if (!existing || existing.clubID !== auth.user.clubID || !canManagePlane(existing, auth.user)) {
            return { error: 'Permissions insuffisantes' };
        }

        await prisma.planes.update({
            where: { id: planeID },
            data: { operational }
        });

        return { success: 'Plane updated successfully' };
    } catch {
        return { error: 'Plane update failed' };
    }
};

export const getPlaneByID = async (planeID: string) => {
    try {
        const plane = await prisma.planes.findUnique({
            where: {
                id: planeID,
            },
        });

        return plane;
    } catch {
        return { error: 'Plane get failed' };
    }
};

export const getPlanesByID = async (planeID: string[]) => {
    try {
        const planes = await prisma.planes.findMany({
            where: {
                id: {
                    in: planeID.filter((id): id is string => id !== null) // Filtrer les valeurs nulles
                }
            }
        });
        return planes;
    } catch {
        return { error: "Erreur lors de la récupération des avions" };
    }
};

export const getAllPlanesOperational = async (clubID: string) => {
    const auth = await requireAuth();
    if ('error' in auth) return { error: auth.error };
    if (auth.user.clubID !== clubID) return { error: "Permissions insuffisantes" };

    try {
        const planes = await prisma.planes.findMany({
            where: {
                clubID: clubID,
                operational: true
            }
        })
        // Masque les machines privées des autres membres (mais garde la machine
        // privée du membre courant, pour qu'il puisse la réserver).
        return filterVisiblePlanes(planes, auth.user);
    } catch {
        return { error: "Erreur lors de la récupération des avions" };
    }

}

export const updatePlane = async (plane: planes) => {
    if (!plane.id) {
        return { error: 'Missing planeID' };
    }
    if (!plane.name && !plane.immatriculation && !plane.operational && !plane.classes) {
        return { error: 'Missing plane data' };
    }

    const auth = await requireAuth();
    if ('error' in auth) return { error: auth.error };

    try {
        const existing = await prisma.planes.findUnique({ where: { id: plane.id } });
        if (!existing || existing.clubID !== auth.user.clubID || !canManagePlane(existing, auth.user)) {
            return { error: 'Permissions insuffisantes' };
        }

        // Compteur horaire : gestion (OWNER/ADMIN) sur toute machine, et le
        // propriétaire sur sa propre machine privée.
        const canEditHobbs = canEditPlaneHobbs(existing, auth.user);

        // Les usages ne concernent que les machines du club : on ne les met à
        // jour que pour une machine du club (ownerID null), avec les valeurs
        // valides. Le type privé/club (ownerID) n'est pas modifiable ici.
        const nextUsageTypes = existing.ownerID == null
            ? sanitizeClubUsages(plane.usageTypes)
            : existing.usageTypes;

        await prisma.planes.update({
            where: { id: plane.id },
            data: {
                name: plane.name,
                immatriculation: plane.immatriculation,
                operational: plane.operational,
                classes: plane.classes,
                hobbsTotal: canEditHobbs ? plane.hobbsTotal : existing.hobbsTotal,
                usageTypes: nextUsageTypes,
            }
        });

        return { success: 'Plane updated successfully' };
    } catch {
        return { error: 'Plane update failed' };
    }
};