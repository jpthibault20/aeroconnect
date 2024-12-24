'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'
import { createUser } from '@/api/db/users'

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const { error: errorAuth } = await supabase.auth.signUp({
        email: formData.get('email') as string,
        password: formData.get('password') as string
    })
    if (errorAuth) {
        console.log(errorAuth.message)
        redirect('/auth/login?message=Une erreur est survenue lors de la création du compte, se rapprocher de l\'administrateur (E_009: failed to create auth user)')
    }

    try {
        await createUser({
            firstName: formData.get('firstName') as string,
            lastName: formData.get('lastName') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
        })
    } catch (error) {
        console.log(error)
        return redirect('/auth/register?message=Une erreur est survenue lors de la création du compte, se rapprocher de l\'administrateur (E_010: failed to create private user)')
    }

    revalidatePath('/', 'layout')
    redirect(`/auth/login?messageG=${encodeURIComponent('compte créé avec succès')}`);
}