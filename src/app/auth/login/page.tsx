import { createClient } from '@/utils/supabase/server'
import { Login } from '@/components/auth/login'
import React, { Suspense } from 'react'
import { redirect } from 'next/navigation'

const LoginPage = async () => {
    const supabase = createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user) {
        return redirect("/homePage");
    }
    
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <div className="">
                <Login />
            </div>
        </Suspense>
    )
}

export default LoginPage
