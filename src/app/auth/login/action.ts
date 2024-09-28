'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'

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

export async function signup(formData: FormData) {
    const supabase = createClient()

    // type-casting here for convenience
    // in practice, you should validate your inputs
    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        phone: formData.get('phone') as string,
        name: formData.get('name') as string,
        firstName: formData.get('firstName') as string,
    }

    const { error } = await supabase.auth.signUp(data)

    if (error) {
        redirect('/auth/login?message=Could not create user')
    }

    revalidatePath('/', 'layout')
    redirect('/auth/login')
}

export async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    redirect('/auth/login')
}