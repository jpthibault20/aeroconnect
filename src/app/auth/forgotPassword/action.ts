import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"


export async function forgotPassword(formData: FormData) {
    const supabase = await createClient()

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