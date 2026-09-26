"use server"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { updatePasswordRedirect, validateNewPassword } from "@/lib/authFlow"


export async function updatePassword(formData: FormData) {

    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    const code = formData.get('code') as string

    const check = validateNewPassword(password, confirmPassword)
    if (!check.ok) {
        return redirect(check.redirect)
    }

    const supabase = await createClient()
    const res = await supabase.auth.exchangeCodeForSession(code)
    const email = res.data.user?.email

    if (!email) {
        return redirect(updatePasswordRedirect('missingEmail'))
    }

    const { error } = await supabase.auth.updateUser({
        password,
    })

    if (error) {
        return redirect(updatePasswordRedirect('updateError'))
    }

    return redirect(updatePasswordRedirect('success'))
}
