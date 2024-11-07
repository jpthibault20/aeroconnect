"use server";
import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient()

interface AddPlane {
    name: string,
    immatriculation: string,
    clubID: string
}

export const createPlane = async (dataPlane: AddPlane) => {
    if (!dataPlane.name || !dataPlane.immatriculation || !dataPlane.clubID) {
        return { error: 'Missing required fields' };
    }

    try {
        // Vérification de l'existence d'un avion avec le même nom ou la même immatriculation
        const existingPlane = await prisma.planes.findFirst({
            where: {
                OR: [
                    { name: dataPlane.name, clubID: dataPlane.clubID },
                    { immatriculation: dataPlane.immatriculation, clubID: dataPlane.clubID }
                ]
            }
        });

        if (existingPlane) {
            return {
                error: 'un avion existe déjà avec au moins un des champs entées'
            };
        }

        // Création du nouvel avion si aucun duplicata n'est trouvé
        await prisma.planes.create({
            data: {
                clubID: dataPlane.clubID,
                name: dataPlane.name,
                immatriculation: dataPlane.immatriculation,
            },
        });

        return { succes: "Plane created successfully" };

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