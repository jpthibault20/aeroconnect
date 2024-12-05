"use server";
import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient()

export const getAllClubs = async () => {
    try {
        // Récupérer tous les clubs dans la table "Club"
        const clubs = await prisma.club.findMany({
            select: {
                id: true,
                Name: true,
            },
        });

        // Transformer les données en tableau au format souhaité
        const result = clubs.map((club) => ({
            id: club.id,
            name: `${club.id} (${club.Name})`,
        }));

        return result;
    } catch (error) {
        console.error("Erreur lors de la récupération des clubs :", error);
        return [];
    } finally {
        // Assurez-vous que Prisma se déconnecte correctement
        await prisma.$disconnect();
    }
};

export const getClub = async (clubID: string) => {
    try {
        // Récupérer tous les clubs dans la table "Club"
        const club = await prisma.club.findUnique({
            where: {
                id: clubID,
            }
        });

        return club;
    } catch (error) {
        console.error("Erreur lors de la récupération des clubs :", error);
        return ;
    } finally {
        // Assurez-vous que Prisma se déconnecte correctement
        await prisma.$disconnect();
    }
};