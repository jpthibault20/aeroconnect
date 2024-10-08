import { getSession } from '@/api/db/db'
import { Login } from '@/components/auth/login'
import { redirect } from 'next/navigation';
import React, { Suspense } from 'react'

const LoginPage = async () => {
    const auth = await getSession();
    if (!auth) {
        return (
            <Suspense fallback={<div>Loading...</div>}>
                <div className="">
                    <Login />
                </div>
            </Suspense>
        )
    }
    else {
        redirect('/homePage')
    }


}

export default LoginPage
