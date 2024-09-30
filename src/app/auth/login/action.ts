'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'
import { Provider } from '@supabase/supabase-js'


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

export async function oAuthSignin(provider: Provider) {
    if(!provider){
        return redirect('/auth/login?message=No provider selected')
    }

    const supabase = createClient()
    const redirectUrl = process.env.WEBSITE_LINK+'/auth/callback'

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

    revalidatePath('/', 'layout')
    redirect('/homePage')
}

export async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    redirect('/auth/login')
}

