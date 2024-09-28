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
                Home Page
                <p>
                    {user.email}
                    <br />
                    {user.phone}
                    <br />
                    {user.created_at}
                    <br />
                    {user.updated_at}
                    <br />
                    {user.id}
                    <br />
                    {user.role}
                    <br />
                    {user.email_confirmed_at}
                    <br />
                    {user.aud}

                </p>
                <Button>Sign out</Button>
            </form>
        </div>
    )
}

export default page
