'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'
import { Provider } from '@supabase/supabase-js'
import { createUser } from '@/api/db/users'
// import prisma from '@/api/prisma'


export async function emailLogin(formData: FormData) {
    const supabase = createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const [{error}] = await Promise.all([
        supabase.auth.signInWithPassword(data),
        // prisma.user.findFirst({ where: { email: data.email }, select: { clubID: true } })
    ])

    if (error) {
        redirect("/auth/login?message=Impossible d'authentifier l'utilisateur")
    }

    // revalidatePath('/', 'layout')
    redirect(`/calendar?clubID=LF`)
}

export async function emailSignup(formData: FormData) {

    // type-casting here for convenience
    if (!formData.get('email') || !formData.get('password') || !formData.get('firstName') || !formData.get('lastName') || !formData.get('phone')) {
        return redirect('/auth/register?message=Missing required fields')
    }

    const supabase = createClient()

    // type-casting here for convenience
    // in practice, you should validate your inputs

    const { error: errorAuth } = await supabase.auth.signUp({
        email: formData.get('email') as string,
        password: formData.get('password') as string
    })
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
export async function forgotPassword(formData: FormData) {
    const supabase = createClient()

    // Récupérer l'email du formulaire
    const email = formData.get('email') as string

    if (!email) {
        return redirect('/auth/forgotPassword?message=Email manquant')
    }

    // Utiliser Supabase pour envoyer un email de réinitialisation de mot de passe
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.WEBSITE_LINK}/auth/newPassword`, // Page vers laquelle rediriger après réinitialisation
    })

    if (error) {
        console.log('Erreur lors de l\'envoi de l\'email de réinitialisation :', error.message)
        return redirect(`/auth/forgotPassword?message=${encodeURIComponent('Erreur lors de l\'envoi de l\'email de réinitialisation')}`)
    }

    // Réponse après envoi réussi
    return redirect(`/auth/login?messageG=${encodeURIComponent('Email de réinitialisation envoyé')}`)
}

export async function updatePassword(formData: FormData) {

    // Récupérer l'email du formulaire
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    const code = formData.get('code') as string

    if (!password || !confirmPassword) {
        return redirect('/auth/forgotPassword?message=Mot de passe manquant')
    }

    if (password !== confirmPassword) {
        return redirect('/auth/forgotPassword?message=Les mots de passe ne correspondent pas')
    }

    const supabase = createClient()
    const res = await supabase.auth.exchangeCodeForSession(code)
    const email = res.data.user?.email

    if (!email) {
        return redirect('/auth/login?message=Une erreur es survenue')
    }




    // Utiliser Supabase pour mettre à jour le mot de passe
    const { error } = await supabase.auth.updateUser({
        password,
    })

    if (error) {
        console.log('Erreur lors de la mise à jour du mot de passe :', error.message)
        return redirect(`/auth/forgotPassword?message=${encodeURIComponent('Erreur lors de la mise à jour du mot de passe')}`)
    }

    // Réponse après mise à jour réussie
    return redirect(`/auth/login?messageG=${encodeURIComponent('Mot de passe mis à jour')}`)
}