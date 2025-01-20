"use server";
import { ClubFormValues } from "@/components/NewClub";
import { defaultMinutes } from "@/config/config";
import { dayFr } from "@/config/config";
import { sendNotificationRequestClub } from "@/lib/mail";
import { userRole } from "@prisma/client";
import prisma from "../prisma";

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
        return;
    } finally {
        // Assurez-vous que Prisma se déconnecte correctement

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
                AvailableMinutes: defaultMinutes, // Remplacez `minutes` par la logique réelle si nécessaire
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
        return { success: "L'utilisateur a été mis à jour avec succès !" };
    } catch (error) {
        console.error('Error blocking user:', error);
        return { error: "Erreur lors de la mise à jour de l'utilisateur" };
    }
}

export const getAllUserRequestedClubID = async (clubID: string) => {
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

export const acceptMembershipRequest = async (userID: string, clubID: string | null, role: userRole, classes: number[]) => {
    if (!userID) {
        return { error: "Une erreur est survenue (E_001: userID is undefined)" };
    }
    if (!clubID) {
        return { error: "Une erreur est survenue (E_001: clubID is undefined)" };
    }

    try {
        // Mise à jour utilisateur et récupération club en parallèle
        const [user, club] = await Promise.all([
            prisma.user.update({
                where: { 
                    id: userID 
                },
                data: { 
                    clubIDRequest: null, 
                    clubID: clubID,
                    role: role,
                    classes: classes
                },
                select: { 
                    email: true 
                }
            }),
            prisma.club.findUnique({
                where: { id: clubID },
                select: { id: true },
            }),
        ]);

        if (!club) {
            return { error: "Le club spécifié est introuvable." };
        }

        // Envoi de l'email en tâche de fond
        await sendNotificationRequestClub(user.email as string, club.id)

        return { success: "L'utilisateur a été mis à jour avec succès !" };
    } catch (error) {
        console.error("Erreur lors de la mise à jour de l'utilisateur :", error);
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

export const getClubAdress = async (clubID: string) => {
    try {
        const club = await prisma.club.findUnique({
            where: {
                id: clubID
            },
            select: {
                Country: true,
                ZipCode: true,
                City: true,
                Address: true,
            }
        });
        return club;
    } catch (error) {
        console.error('Error fetching club adress:', error);
        return null;
    }
}

export interface ConfigClub {
    clubName: string; // Nom du club
    clubId: string; // Identifiant unique du club
    address: string; // Adresse du club
    city: string; // Ville du club
    zipCode: string; // Code postal
    country: string; // Pays
    owners: string[]; // Liste des propriétaires (par leurs identifiants ou noms)
    classes: number[]; // Liste des classes ULM (identifiées par des IDs ou numéros)
    hourStart: string; // Heure de début au format HH:mm
    hourEnd: string; // Heure de fin au format HH:mm
    timeOfSession: number; // Durée de la session en minutes
    userCanSubscribe: boolean; // Les utilisateurs peuvent s'inscrire
    preSubscribe: boolean; // Inscription préalable requise
    timeDelaySubscribeminutes: number; // Délai d'inscription en minutes
    userCanUnsubscribe: boolean; // Les utilisateurs peuvent se désinscrire
    preUnsubscribe: boolean; // Désinscription préalable requise
    timeDelayUnsubscribeminutes: number; // Délai de désinscription en minutes
    firstNameContact: string; // Prénom de la personne de contact
    lastNameContact: string; // Nom de la personne de contact
    mailContact: string; // Adresse e-mail de la personne de contact
    phoneContact: string; // Numéro de téléphone de la personne de contact
}

export const updateClub = async (clubID: string, data: ConfigClub) => {
    // layout of working hours
    const workingHour: number[] = [];
    const startHour = parseInt(data.hourStart.split(":")[0], 10);
    const endHour = parseInt(data.hourEnd.split(":")[0], 10);
    for (let i = startHour; i <= endHour; i++) {
        workingHour.push(i);
    }

    try {
        // Mise à jour du club
const updateClub = prisma.club.update({
    where: {
        id: clubID,
    },
    data: {
        Name: data.clubName,
        Address: data.address,
        City: data.city,
        ZipCode: data.zipCode,
        Country: data.country,
        OwnerId: data.owners,
        classes: data.classes,
        HoursOn: workingHour,
        SessionDurationMin: data.timeOfSession,
        userCanSubscribe: data.userCanSubscribe,
        preSubscribe: data.preSubscribe,
        timeDelaySubscribeminutes: data.timeDelaySubscribeminutes,
        userCanUnsubscribe: data.userCanUnsubscribe,
        preUnsubscribe: data.preUnsubscribe,
        timeDelayUnsubscribeminutes: data.timeDelayUnsubscribeminutes,
        firstNameContact: data.firstNameContact,
        lastNameContact: data.lastNameContact,
        mailContact: data.mailContact,
        phoneContact: data.phoneContact,
    },
});

// Mise à jour des utilisateurs (owners)
const updateOwners = Promise.all(
    data.owners.map((ownerId: string) =>
        prisma.user.update({
            where: { id: ownerId },
            data: {
                classes: data.classes,
            },
        })
    )
);

// Lancer les deux requêtes en parallèle
await Promise.all([updateClub, updateOwners]);


        return { success: "La configuration a été mise à jour avec succès !" };
    } catch (error) {
        console.error("Erreur lors de la mise à jour de la configuration :", error);
        return { error: "Erreur lors de la mise à jour de la configuration" };
    }
};