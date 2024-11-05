"use server";
import { createClient } from '@/utils/supabase/server';
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface User {
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
}

export const createUser = async (dataUser: User) => {
    if (!dataUser.firstName || !dataUser.lastName || !dataUser.email || !dataUser.phone) {
        return { error: 'Missing required fields' }
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const user = await prisma.user.create({
            data: {
                clubID: "LF5722",
                firstName: dataUser.firstName,
                lastName: dataUser.lastName,
                email: dataUser.email,
                phone: dataUser.phone,
            },
        });
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
        return users;
    } catch (error) {
        console.error('Error getting user:', error);
        return { error: "Erreur lors de la récupération des utilisateurs" };
    }
    finally {
        await prisma.$disconnect();
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
    const supabase = createClient()
    let result;
    let data;

    try {
        data = await supabase.auth.getUser();
    } catch (error) {
        console.log(error)
        return { error: "Error getting user session" };
    }

    try {
        result = await prisma.user.findUnique({
            where: { email: data?.data.user?.email },
        })
    } catch (error) {
        console.log(error)
        return { error: "Error getting user from database" };
    }

    return {
        succes: "User retrieved successfully",
        user: result
    }
}
