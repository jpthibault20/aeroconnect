"use server"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { forgotPasswordRedirect, passwordResetRedirectTo } from "@/lib/authFlow"


export async function forgotPassword(formData: FormData) {
    const supabase = await createClient()

    // Récupérer l'email du formulaire
    const email = formData.get('email') as string

    if (!email) {
        return redirect(forgotPasswordRedirect('missingEmail'))
    }

    // Utiliser Supabase pour envoyer un email de réinitialisation de mot de passe
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Page vers laquelle rediriger après réinitialisation
        redirectTo: passwordResetRedirectTo(process.env.WEBSITE_LINK),
    })

    if (error) {
        return redirect(forgotPasswordRedirect('sendError'))
    }

    // Réponse après envoi réussi
    return redirect(forgotPasswordRedirect('sent'))
}
