"use server";
import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/utils/supabase/server'
import { createUser } from '@/api/db/db'
import { redirect } from 'next/navigation'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/homePage'

    if (code) {
        const supabase = createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {

            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !sessionData.session) {
                console.log(sessionError)
            }

            // Récupération des informations de l'utilisateur
            const user = sessionData.session?.user;
            const [firstName, lastName] = user!.user_metadata.full_name.split(' ');
            const { email, phone } = user!.user_metadata;

            try {
                await createUser({
                    firstName,
                    lastName,
                    email,
                    phone: phone || " ",
                })

            } catch (error) {
                console.log(error)
                return redirect('/auth/register?message=Could not create privat user')
            }

            const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === 'development'
            if (isLocalEnv) {
                // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
                return NextResponse.redirect(`${origin}${next}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`)
            } else {
                return NextResponse.redirect(`${origin}${next}`)
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/login?message=Could not login with provided`)
}