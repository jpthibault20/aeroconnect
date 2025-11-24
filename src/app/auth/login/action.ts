'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect('/auth/login?message=Informations de connexion incorrectes (E_008: invalid credentials)')
    }

    // Remplacer Prisma par Supabase pour récupérer le clubID
    const { data: userClub, error: dbError } = await supabase
        .from('user')
        .select('clubID')
        .eq('email', data.email)
        .single()

    // Gérer l'erreur si l'utilisateur n'est pas trouvé
    if (dbError) {
        console.error('Database error:', dbError)
        revalidatePath('/', 'layout')
        redirect('/calendar')
        return
    }

    revalidatePath('/', 'layout')
    redirect(`/calendar?clubID=${userClub?.clubID || ''}`)
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/auth/login')
}