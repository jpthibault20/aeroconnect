"use server";

import { planes } from "@prisma/client";
import prisma from "../prisma";

export const createPlane = async (dataPlane: planes) => {
    if (!dataPlane.name || !dataPlane.immatriculation || !dataPlane.clubID) {
        return { error: 'Missing required fields' };
    }

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
            },
        });

        // Récupération et retour de tous les avions pour ce club
        const planes = await prisma.planes.findMany({
            where: {
                clubID: dataPlane.clubID,
            },
        });

        return { success: 'Aion créé avec succès !', planes };

    } catch (error) {
        console.error(error);
        return {
            error: 'Plane creation failed',
        };
    }
};


export const getPlanes = async (clubID: string) => {
    if (!clubID) {
        return { error: 'Missing clubID' };
    }
    try {
        const planes = await prisma.planes.findMany({
            where: {
                clubID: clubID
            }
        });

        return planes;
    } catch (error) {
        console.error('Error getting planes:', error);
        return [];
    }
};

export const deletePlane = async (planeID: string) => {
    if (!planeID) {
        return { error: 'Missing planeID' };
    }
    try {
        const plane = await prisma.planes.findFirst({
            where: {
                id: planeID
            }
        });

        if (!plane) {
            return { error: 'Plane not found' };
        }

        await prisma.planes.delete({
            where: {
                id: planeID
            }
        });

        return { success: 'Plane deleted successfully' };
    } catch (error) {
        console.error('Error deleting plane:', error);
        return {
            error: 'Plane deletion failed',
        };
    }
};

export const updateOperationalByID = async (planeID: string, operational: boolean) => {
    if (!planeID) {
        return { error: 'Missing planeID' };
    }
    try {
        await prisma.planes.update({
            where: {
                id: planeID
            },
            data: {
                operational: operational
            }
        });

        return { success: 'Plane updated successfully' };
    } catch (error) {
        console.error('Error updating plane:', error);
        return {
            error: 'Plane update failed',
        };
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
    } catch (error) {
        console.error('Error getting plane:', error);
        return {
            error: 'Plane get failed',
        };
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
    } catch (error) {
        console.error('Error getting planes:', error);
        return { error: "Erreur lors de la récupération des avions" };
    }
};

export const getAllPlanesOperational = async (clubID: string) => {
    try {
        const planes = await prisma.planes.findMany({
            where: {
                clubID: clubID,
                operational: true
            }
        })
        return planes;
    } catch (error) {
        console.error('Error getting planes:', error);
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
    try {
        await prisma.planes.update({
            where: {
                id: plane.id
            },
            data: {
                name: plane.name,
                immatriculation: plane.immatriculation,
                operational: plane.operational,
                classes: plane.classes,
            }
        });

        return { success: 'Plane updated successfully' };
    } catch (error) {
        console.error('Error updating plane:', error);
        return {
            error: 'Plane update failed',
        };
    }
};