import { Login } from '@/components/auth/login'
import RequireAuth from '@/components/auth/requireAuth'
import React, { Suspense } from 'react'

const LoginPage = async () => {


    return (
        <RequireAuth redirectToAuth={false}>
            <Suspense fallback={<div>Loading...</div>}>
                <div className="">
                    <Login />
                </div>
            </Suspense>
        </RequireAuth>
    )
}

export default LoginPage
