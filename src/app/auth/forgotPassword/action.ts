"use server"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { forgotPasswordRedirect, passwordResetRedirectTo } from "@/lib/authFlow"


export async function forgotPassword(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string

    if (!email) {
        return redirect(forgotPasswordRedirect('missingEmail'))
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Page to redirect to after the reset
        redirectTo: passwordResetRedirectTo(process.env.WEBSITE_LINK),
    })

    if (error) {
        return redirect(forgotPasswordRedirect('sendError'))
    }

    return redirect(forgotPasswordRedirect('sent'))
}
