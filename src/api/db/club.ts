"use server";
import { ClubFormValues } from "@/components/NewClub";
import { minutes } from "@/config/configClub";
import { dayFr } from "@/config/date";
import { sendNotificationRequestClub } from "@/lib/mail";
import { PrismaClient, userRole } from "@prisma/client";


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

export const createClub = async (data: ClubFormValues, userID: string) => {
    // Convertir workStartTime et workEndTime en nombres entiers
    const startHour = parseInt(data.workStartTime, 10);
    const endHour = parseInt(data.workEndTime, 10);

    // Générer toutes les heures entre workStartTime et workEndTime sous forme de chaînes
    const allWorkingHour: number[] = Array.from(
        { length: endHour - startHour },
        (_, i) => startHour + i
    );

    try {
        // Créer le club dans la base de données
        await prisma.club.create({
            data: {
                id: data.id,
                Name: data.name,
                Address: data.address,
                City: data.city,
                ZipCode: data.zipCode,
                OwnerId: [userID],
                DaysOn: dayFr, // Remplacez `dayFr` par la logique réelle si nécessaire
                HoursOn: allWorkingHour,
                SessionDurationMin: data.sessionDuration,
                AvailableMinutes: minutes, // Remplacez `minutes` par la logique réelle si nécessaire
            },
        });
        return { success: "Club créé avec succès !" };
    } catch (error) {
        console.error("Erreur lors de la création du club :", error);
        return { error: "Erreur lors de la création du club ou club déjà existant" };
    } finally {
        await prisma.user.update({
            where: {
                id: userID
            },
            data: {
                clubID: data.id,
                clubIDRequest: null,
                role: userRole.OWNER
            }
        });
        await prisma.$disconnect();
    }
};

export const requestClubID = async (clubID: string, userID: string) => {
    if (!clubID) {
        return { error: "Une erreur est survenue (E_001: clubID is undefined)" };
    }
    if (!userID) {
        return { error: "Une erreur est survenue (E_001: userID is undefined)" };
    }

    try {
        await prisma.user.update({
            where: {
                id: userID
            },
            data: {
                clubIDRequest: clubID
            }
        });
        prisma.$disconnect();
        return { success: "L'utilisateur a été mis à jour avec succès !" };
    } catch (error) {
        console.error('Error blocking user:', error);
        return { error: "Erreur lors de la mise à jour de l'utilisateur" };
    }
}


export const getAllUserRequestedClubID = async(clubID: string) => {
    try {
        const user = await prisma.user.findMany({
            where: {
                clubIDRequest: clubID
            }
        })
        prisma.$disconnect();
        return user;
    } catch (error) {
        console.error('Error getting user:', error);
        return { error: "Erreur lors de la récupération des utilisateurs" };
    }
}

export const acceptMembershipRequest = async (userID: string, clubID: string | null) => {
    if (!userID) {
        return { error: "Une erreur est survenue (E_001: userID is undefined)" };
    }
    if (!clubID) {
        return { error: "Une erreur est survenue (E_001: clubID is undefined)" };
    }
    try {
        const user = await prisma.user.update({
            where: {
                id: userID
            },
            data: {
                clubIDRequest: null,
                clubID: clubID
            }
        });
        const club = await prisma.club.findUnique({
            where: { id: clubID },
            select: {
                Name: true
            }
        })
        prisma.$disconnect();
        sendNotificationRequestClub(user?.email as string, club?.Name as string);
        return { success: "L'utilisateur a été mis à jour avec succès !" };
    } catch (error) {
        console.error('Error blocking user:', error);
        return { error: "Erreur lors de la mise à jour de l'utilisateur" };
    }
};


export const rejectMembershipRequest = async (userID: string) => {
    if (!userID) {
        return { error: "Une erreur est survenue (E_001: userID is undefined)" };
    }

    try {
        await prisma.user.update({
            where: {
                id: userID
            },
            data: {
                clubIDRequest: null
            }
        });
        prisma.$disconnect();
        return { success: "L'utilisateur a été mis à jour avec succès !" };
    } catch (error) {
        console.error('Error blocking user:', error);
        return { error: "Erreur lors de la mise à jour de l'utilisateur" };
    }
};