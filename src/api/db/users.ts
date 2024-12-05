"use server";
import { sendNotificationBooking, sendStudentNotificationBooking } from '@/lib/mail';
import { createClient } from '@/utils/supabase/server';
import { PrismaClient, userRole } from '@prisma/client'
import { User } from '@prisma/client'

const prisma = new PrismaClient()

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
    const supabase = createClient()
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
    const supabase = createClient();

    try {
        // Étape 1 : Récupérer l'utilisateur connecté via Supabase
        const { data, error: authError } = await supabase.auth.getUser();

        if (authError) {
            console.error("Erreur lors de la récupération de la session utilisateur :", authError);
            return { error: "Error getting user session" };
        }

        const userEmail = data?.user?.email;

        if (!userEmail) {
            console.error("L'email de l'utilisateur est introuvable dans la session Supabase.");
            return { error: "Error getting user session" };
        }

        // Étape 2 : Récupérer l'utilisateur dans la base de données Prisma
        const user = await prisma.user.findUnique({
            where: { email: userEmail },
        });

        if (!user) {
            console.error(`Aucun utilisateur trouvé avec l'email : ${userEmail}`);
            return { error: "User not found in the database" };
        }

        // Retourner l'utilisateur avec un message de succès
        return {
            success: "User retrieved successfully",
            user,
        };
    } catch (error) {
        console.error("Erreur lors de l'exécution de la fonction getUser :", error);
        return { error: "An unexpected error occurred" };
    } finally {
        // Assurez-vous que Prisma se déconnecte, même en cas d'erreur
        await prisma.$disconnect();
    }
};

export const addStudentToSession = async (sessionID: string, student: { id: string, firstName: string, lastName: string, planeId: string }) => {
    if (!sessionID && !student.id && !student.firstName && !student.lastName) {
        return { error: "Une erreur est survenue (E_001: sessionID ou student.id is undefined)" };
    }
    try {
        await prisma.flight_sessions.update({
            where: {
                id: sessionID
            },
            data: {
                studentID: student.id,
                studentFirstName: student.firstName,
                studentLastName: student.lastName,
                studentPlaneID: student.planeId,
                // student_type: student.type,
            }
        });
        prisma.$disconnect();
        const session = await prisma.flight_sessions.findUnique({
            where: { id: sessionID },
            select: {
                sessionDateStart: true,
                sessionDateDuration_min: true,
                pilotID: true,
            }
        });
        prisma.$disconnect();
        const studentcomp = await prisma.user.findUnique({
            where: { id: student.id },
        });
        prisma.$disconnect();

        if (!session?.pilotID) return { error: "Student not found" }
        const instructor = await prisma.user.findUnique({
            where: { id: session.pilotID },
            select: {
                email: true,
                firstName: true,
                lastName: true,
            }
        })
        prisma.$disconnect();

        const endDate = new Date(session.sessionDateStart)
        endDate.setUTCMinutes(endDate.getUTCMinutes() + session.sessionDateDuration_min)

        await sendNotificationBooking(instructor?.email as string, studentcomp?.firstName as string, studentcomp?.lastName as string, session.sessionDateStart as Date, endDate as Date);
        await sendStudentNotificationBooking(studentcomp?.email as string, session.sessionDateStart as Date, endDate as Date);


        return { success: "L'élève a été ajouté au vol !" };
    } catch (error) {
        console.error('Error adding student:', error);
        return { error: "Erreur lors de l'ajout de l'élève au vol" };
    }
}

export const deleteUser = async (studentID: string) => {
    if (!studentID) {
        return { error: "Une erreur est survenue (E_001: studentID is undefined)" };
    }
    try {
        await prisma.user.delete({
            where: {
                id: studentID
            }
        });
        prisma.$disconnect();
        console.log('User deleted successfully');
        return { success: "L'utilisateur a été supprimé avec succès !" };
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
            }
        });
        prisma.$disconnect();
        console.log('User updated successfully');
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
export const cancelClubIDRequest = async (userID: string) => {
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
}