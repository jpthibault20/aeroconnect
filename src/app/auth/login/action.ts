'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'
import prisma from '@/api/prisma'

export async function login(formData: FormData) {
    const supabase = await createClient()

    // type-casting here for convenience
    // in practice, you should validate your inputs
    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect('/auth/login?message=Informations de connexion incorrectes (E_008: invalid credentials)')
    }

    const userClub = await prisma.user.findFirst({
        where: { email: data.email },
        select: { clubID: true },
    });

    revalidatePath('/', 'layout')
    redirect(`/calendar?clubID=${userClub?.clubID || ''}`);
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/auth/login')
}