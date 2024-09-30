import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react'

interface Props {
    children: React.ReactNode
    redirectToAuth: boolean
}

const RequireAuth = async ({ children, redirectToAuth }: Props) => {
    const supabase = createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user && redirectToAuth === false) {
        return redirect("/homePage");
    }
    if (!user && redirectToAuth === true) {
        return redirect("/auth/login");
    }
    
    return (
        <div>
            {children}
        </div>
    )
}

export default RequireAuth
