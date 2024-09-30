"use server";
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
                clubID: 1,
                firstName: dataUser.firstName,
                lastName: dataUser.lastName,
                email: dataUser.email,
                phone: dataUser.phone,
            },
        });
        return {succes: "User created successfully"};

    } catch (error) {
        // Gestion des erreurs éventuelles
        console.log(error);
        return {
            error: 'User creation failed',
        };
    }
}