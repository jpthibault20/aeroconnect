"use server";
import { createClient } from '@/utils/supabase/server';
import { userRole } from '@prisma/client'
import { User } from '@prisma/client'
import prisma from '../prisma';

export interface InvitedStudent {
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
}

interface UserMin {
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
}

export const createUser = async (dataUser: UserMin) => {
    if (!dataUser.firstName || !dataUser.lastName || !dataUser.email || !dataUser.phone) {
        return { error: 'Missing required fields' }
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const user = await prisma.user.create({
            data: {
                firstName: dataUser.firstName,
                lastName: dataUser.lastName,
                email: dataUser.email,
                phone: dataUser.phone,
            },
        });
        prisma.$disconnect();
        return { succes: "User created successfully" };

    } catch (error) {
        // Gestion des erreurs éventuelles
        console.log(error);
        return {
            error: 'User creation failed',
        };
    }
}

export const getAllUser = async (clubID: string) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                clubID: clubID
            }
        })
        prisma.$disconnect();
        return users;
    } catch (error) {
        console.error('Error getting user:', error);
        return { error: "Erreur lors de la récupération des utilisateurs" };
    }

}

// récupération de la session de l'utilisateur
export const getSession = async () => {
    const supabase = await createClient()
    try {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        return user;
    } catch {
        return { error: "No session available" }
    }



}

export const getUser = async () => {
    const supabase = await createClient()
    try {
        const { data, error: authError } = await supabase.auth.getUser();
        if (authError || !data?.user) {
            console.log("Erreur de récupération de l'utilisateur Supabase :", authError?.message);
            return { error: "Utilisateur non connecté ou session invalide." };
        }

        const userEmail = data.user.email;
        if (!userEmail) {
            console.error("L'utilisateur connecté n'a pas d'email.");
            return { error: "L'email de l'utilisateur est introuvable dans la session Supabase." };
        }

        const user = await prisma.user.findUnique({
            where: { email: userEmail },
        });

        if (!user) {
            console.error(`Aucun utilisateur trouvé avec l'email : ${userEmail}`);
            return { error: `Aucun utilisateur n'est associé à l'email : ${userEmail}` };
        }

        return {
            success: "Utilisateur récupéré avec succès",
            user,
        };
    } catch (error) {
        console.error("Erreur lors de l'exécution de la fonction getUser :", error);
        return { error: "Une erreur inattendue est survenue lors de la récupération de l'utilisateur." };
    }
};


export const addStudentToSession = async (sessionID: string, student: { id: string, firstName: string, lastName: string, planeId: string, email: string, phone: string }, timeOffset: number) => {

    const nowDate = new Date();
    nowDate.setMinutes(nowDate.getMinutes() - timeOffset);

    if (!sessionID || !student.id || !student.firstName || !student.lastName || !student.planeId || !student.email || !student.phone) {
        return { error: "Une erreur est survenue (E_001: paramètres invalides)" };
    }

    try {
        // Étape 1 : Charger les données critiques
        const [session, plane] = await Promise.all([
            prisma.flight_sessions.findUnique({
                where: { id: sessionID },
                select: {
                    id: true,
                    pilotID: true,
                    sessionDateStart: true,
                    sessionDateDuration_min: true,
                    clubID: true,
                },
            }),
            prisma.planes.findUnique({
                where: { id: student.planeId },
            })
        ]);

        // Vérifications critiques
        if (!session) {
            return { error: "Session introuvable." };
        }

        if (student.planeId != "classroomSession" && student.planeId != "noPlane" && !plane?.operational) {
            return { error: "L'avion est désactivé par l'administrateur du club." };
        }

        if (session.sessionDateStart < nowDate) {
            return { error: "La date de la session est passée." };
        }

        // Étape 2 : Mise à jour rapide de la session
        await prisma.flight_sessions.update({
            where: { id: sessionID },
            data: {
                studentID: student.id,
                studentFirstName: student.firstName,
                studentLastName: student.lastName,
                studentPlaneID: student.planeId,
                studentEmail: student.email,
                studentPhone: student.phone,
            },
        });

        return { success: "L'élève a été ajouté au vol !" };

    } catch (error) {
        console.error("Erreur lors de l'ajout de l'élève :", error);
        return { error: "Erreur lors de l'ajout de l'élève au vol." };
    }
};


export const deleteUser = async (studentID: string) => {
    if (!studentID) {
        return { error: "Une erreur est survenue (E_001: studentID is undefined)" };
    }
    try {
        await prisma.user.update({
            where: {
                id: studentID
            },
            data: {
                clubID: null,
                restricted: false,
                classes: [],
                role: userRole.USER
            }
        });
        prisma.$disconnect();
        console.log('User deleted successfully');
        return { success: "L'utilisateur a été supprimé de votre club avec succès !" };
    } catch (error) {
        console.error('Error deleting user:', error);
        return { error: "Erreur lors de la suppression de l'utilisateur" };
    }
}

export const updateUser = async (user: User) => {
    if (!user.id) {
        return { error: "Une erreur est survenue (E_001: user.id is undefined)" };
    }
    try {
        await prisma.user.update({
            where: {
                id: user.id
            },
            data: {
                clubID: user.clubID,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                adress: user.adress,
                city: user.city,
                zipCode: user.zipCode,
                role: user.role,
                restricted: user.restricted,
                country: user.country,
                classes: user.classes,
                canSubscribeWithoutPlan: user.canSubscribeWithoutPlan,
            }
        });
        prisma.$disconnect();
        return { success: "L'utilisateur a été mis à jour avec succès !" };
    } catch (error) {
        console.error('Error updating user:', error);
        return { error: "Erreur lors de la mise à jour de l'utilisateur" };
    }
}

export const getUserByID = async (id: string[]) => {
    try {
        const user = await prisma.user.findMany({
            where: {
                id: {
                    in: id
                }
            }
        })
        prisma.$disconnect();
        return user;
    } catch (error) {
        console.error('Error getting user:', error);
        return { error: "Erreur lors de la récupération des utilisateurs" };
    }

}

export const getInsctructors = async (clubID: string | undefined) => {
    if (!clubID) {
        return { error: "Une erreur est survenue (E_001: clubID is undefined)" };
    }
    try {
        const instructors = await prisma.user.findMany({
            where: {
                clubID,
                role: { in: [userRole.INSTRUCTOR, userRole.ADMIN, userRole.OWNER] }
            }
        })
        prisma.$disconnect();
        return instructors;
    } catch (error) {
        console.error('Error getting instructors:', error);
        return { error: "Erreur lors de la récupération des instructeurs" };
    }

}

export const blockUser = async (userID: string, restricted: boolean) => {
    if (!userID) {
        console.log('userID is undefined');
        return { error: "Une erreur est survenue (E_001: userID is undefined)" };
    }
    try {
        await prisma.user.update({
            where: {
                id: userID
            },
            data: {
                restricted: restricted
            }
        });
        prisma.$disconnect();
        return { success: "L'utilisateur a été bloqué avec succès !" };
    } catch (error) {
        console.error('Error blocking user:', error);
        return { error: "Erreur lors de la mise à jour de l'utilisateur" };
    }
}

export const updateUserClub = async (userID: string, clubID: string) => {
    if (!userID) {
        return { error: "Une erreur est survenue (E_001: userID is undefined)" };
    }
    try {
        await prisma.user.update({
            where: {
                id: userID
            },
            data: {
                clubID: clubID
            }
        });
        return { success: "L'utilisateur a été mis à jour avec succès !" };
    } catch (error) {
        console.error('Error updating user:', error);
        return { error: "Erreur lors de la mise à jour de l'utilisateur" };
    }
}