"use server";
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createUser } from '@/api/db/db';
import { redirect } from 'next/navigation';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/homePage';

    if (!code) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/login?message=Missing OAuth code`);
    }

    const supabase = createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/login?message=Failed to exchange OAuth code`);
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData?.session || !sessionData.session.user) {
        return redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/login?message=Session error`);
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
            return redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/register?message=User creation failed`);
        }

        const forwardedHost = request.headers.get('x-forwarded-host');
        const isLocalEnv = process.env.NODE_ENV === 'development';
        const baseUrl = isLocalEnv ? `${process.env.NEXT_PUBLIC_BASE_URL}` : `https://${forwardedHost || process.env.NEXT_PUBLIC_BASE_URL}`;

        return NextResponse.redirect(`${baseUrl}${next}`);
    } else {
        return redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/login?message=Could not retrieve user information`);
    }
}
