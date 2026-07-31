'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import prisma from '@/api/prisma'
import { AUTH_ROUTES, loginFailure, loginRedirect } from '@/lib/authFlow'

export async function login(formData: FormData) {
    const supabase = await createClient();

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    };

    const { error } = await supabase.auth.signInWithPassword(data);

    if (error) {
        return loginFailure();
    }

    const userClub = await prisma.user.findFirst({
        where: { email: data.email },
        select: { clubID: true },
    });

    revalidatePath('/', 'layout');
    redirect(loginRedirect(userClub?.clubID));
}


export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect(AUTH_ROUTES.login)
}
