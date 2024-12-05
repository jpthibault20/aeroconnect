import { getUser } from '@/api/db/users'
import { Login } from '@/components/auth/login'
import { redirect } from 'next/navigation';
import React, { Suspense } from 'react'

const LoginPage = async () => {
    const user = await getUser();

    if (user.error) {
        return (
            <Suspense fallback={<div>Loading...</div>}>
                <div className="">
                    <Login />
                </div>
            </Suspense>
        )
    }
    else {
        redirect(`/calendar?clubID=${user.user?.clubID || ''}`)
    }


}

export default LoginPage
