"use server"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"


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

    const supabase =  await createClient()
    const res = await supabase.auth.exchangeCodeForSession(code)
    const email = res.data.user?.email

    if (!email) {
        return redirect('/auth/login?message=Email manquant')
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