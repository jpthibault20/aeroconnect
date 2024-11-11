"use server";
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createUser } from '@/api/db/users';
import { redirect } from 'next/navigation';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/homePage';

    if (!code) {
        return NextResponse.redirect(`${origin}/auth/login?message=Missing OAuth code`);
    }

    const supabase = createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
        return NextResponse.redirect(`${origin}/auth/login?message=Failed to exchange OAuth code`);
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData?.session || !sessionData.session.user) {
        return redirect('/auth/login?message=Session error');
    }

    const user = sessionData.session.user;

    if (user && user.user_metadata?.full_name) {
        const [firstName, lastName] = user.user_metadata.full_name.split(' ');
        const { email, phone } = user.user_metadata;

        try {
            await createUser({
                firstName,
                lastName,
                email,
                phone: phone ?? " ",
            });
        } catch (error) {
            console.error("Error creating user:", error);
            return redirect('/auth/register?message=User creation failed');
        }

        const forwardedHost = request.headers.get('x-forwarded-host');
        const isLocalEnv = process.env.NODE_ENV === 'development';
        if (isLocalEnv) {
            // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
            return NextResponse.redirect(`${origin}${next}`)
        } else if (forwardedHost) {
            return NextResponse.redirect(`https://${forwardedHost}${next}`)
        } else {
            return NextResponse.redirect(`${origin}${next}`)
        }
    } else {
        return redirect('/auth/login?message=Could not retrieve user information');
    }
}
