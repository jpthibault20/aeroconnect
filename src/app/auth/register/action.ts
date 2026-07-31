'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'
import { createUser } from '@/api/db/users'
import { signupRedirect } from '@/lib/authFlow'

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const { error: errorAuth } = await supabase.auth.signUp({
        email: formData.get('email') as string,
        password: formData.get('password') as string
    })

    if (errorAuth) {
        redirect(signupRedirect('authError'))
    }

    try {
        await createUser({
            firstName: formData.get('firstName') as string,
            lastName: formData.get('lastName') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
        })
    } catch {
        redirect(signupRedirect('profileError'))
    }

    revalidatePath('/', 'layout')
    redirect(signupRedirect('success'))
}
