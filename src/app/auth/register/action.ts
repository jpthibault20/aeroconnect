'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import prisma from '@/api/prisma'
import { createClient } from '@/utils/supabase/server'
import { signupRedirect } from '@/lib/authFlow'

interface UserMin {
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
}

// Not exported on purpose: an exported function of a "use server" module is a
// public endpoint, and this one would let anyone create a profile for any email.
// It only runs here, right after a successful Supabase sign-up for that email.
const createUser = async (dataUser: UserMin) => {
    if (!dataUser.firstName || !dataUser.lastName || !dataUser.email || !dataUser.phone) {
        return { error: 'Missing required fields' }
    }

    try {
        await prisma.user.create({
            data: {
                firstName: dataUser.firstName,
                lastName: dataUser.lastName,
                email: dataUser.email,
                phone: dataUser.phone,
            },
        });
        return { succes: "User created successfully" };
    } catch {
        return {
            error: 'User creation failed',
        };
    }
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const { error: errorAuth } = await supabase.auth.signUp({
        email: formData.get('email') as string,
        password: formData.get('password') as string
    })

    if (errorAuth) {
        redirect(signupRedirect('authError'))
    }

    try {
        await createUser({
            firstName: formData.get('firstName') as string,
            lastName: formData.get('lastName') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
        })
    } catch {
        redirect(signupRedirect('profileError'))
    }

    revalidatePath('/', 'layout')
    redirect(signupRedirect('success'))
}
