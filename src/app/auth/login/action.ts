'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'
import { Provider } from '@supabase/supabase-js'
import { createUser } from '@/api/db/db'


export async function emailLogin(formData: FormData) {
    const supabase = createClient()

    // type-casting here for convenience
    // in practice, you should validate your inputs
    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect('/auth/login?message=Could not authenticate user')
    }

    revalidatePath('/', 'layout')
    redirect('/homePage')
}

export async function emailSignup(formData: FormData) {

    // type-casting here for convenience
    if (!formData.get('email') || !formData.get('password') || !formData.get('firstName') || !formData.get('lastName') || !formData.get('phone')) {
        return redirect('/auth/register?message=Missing required fields')
    }

    const supabase = createClient()

    // type-casting here for convenience
    // in practice, you should validate your inputs
    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error: errorAuth } = await supabase.auth.signUp(data)
    if (errorAuth) {
        console.log(errorAuth.message)
        redirect('/auth/login?message=Could not create user')
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
        return redirect('/auth/register?message=Could not create private user')
    }



    revalidatePath('/', 'layout')
    redirect(`/auth/login?messageG=${encodeURIComponent('Email de confirmation envoyé')}`);

}

export async function oAuthSignin(provider: Provider) {
    if (!provider) {
        return redirect('/auth/login?message=No provider selected')
    }

    const supabase = createClient()
    const redirectUrl = process.env.WEBSITE_LINK + '/auth/callback'

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: redirectUrl,
        },
    })

    if (error) {
        redirect('/auth/login?message=Could not authenticate user')
    }

    return redirect(data.url)
}

export async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    redirect('/auth/login')
}

// Fonction pour réinitialiser le mot de passe
export async function resetPassword(formData: FormData) {
    const supabase = createClient()

    // Récupérer l'email du formulaire
    const email = formData.get('email') as string

    if (!email) {
        return redirect('/auth/reset-password?message=Email manquant')
    }

    // Utiliser Supabase pour envoyer un email de réinitialisation de mot de passe
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.WEBSITE_LINK}/auth/update-password`, // Page vers laquelle rediriger après réinitialisation
    })

    if (error) {
        console.log('Erreur lors de l\'envoi de l\'email de réinitialisation :', error.message)
        return redirect(`/auth/reset-password?message=${encodeURIComponent('Erreur lors de l\'envoi de l\'email de réinitialisation')}`)
    }

    // Réponse après envoi réussi
    return redirect(`/auth/login?messageG=${encodeURIComponent('Email de réinitialisation envoyé')}`)
}