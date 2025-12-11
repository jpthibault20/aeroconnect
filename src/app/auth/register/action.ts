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
        const errorMessage = encodeURIComponent(
            "Une erreur est survenue lors de la création du compte, se rapprocher de l'administrateur (E_009: failed to create auth user)"
        );
        redirect(`/auth/login?message=${errorMessage}`)
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
        const errorMessage = encodeURIComponent(
            "Une erreur est survenue lors de la création du compte, se rapprocher de l'administrateur (E_010: failed to create private user)"
        );
        redirect(`/auth/register?message=${errorMessage}`)
    }

    revalidatePath('/', 'layout')
    const successMessage = encodeURIComponent('Compte créé avec succès');
    redirect(`/auth/login?messageG=${successMessage}`);
}