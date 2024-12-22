// lib/supabaseServer.ts
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const getSupabaseSession = async () => {
    const supabase = createServerComponentClient({
        cookies
    });

    const {
        data: { session },
    } = await supabase.auth.getSession();

    return session;
};
