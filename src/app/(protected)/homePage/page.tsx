import React from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '@/app/auth/login/action'


const page = async () => {
    const supabase = createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/auth/login");
    }

    return (
        <div>
            <form action={signOut}>
                <p className='text-2xl font-istok'>homePage</p>
                <p>
                    id : {user.id}
                    <br />
                    email : {user.email}
                    <br />
                    phone : {user.phone}
                    <br />
                    created_at : {user.created_at}
                    <br />
                    role : {user.role}
                    <br />
                    email confimed : {user.email_confirmed_at}
                    <br />
                    aud : {user.aud}

                </p>
                <Button>Sign out</Button>
            </form>
        </div>
    )
}

export default page
