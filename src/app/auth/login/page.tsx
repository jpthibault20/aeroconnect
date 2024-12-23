"use server"
import { Login } from '@/components/auth/login'
import React, { Suspense } from 'react'

const LoginPage = async () => {

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <div className="">
                <Login />
            </div>
        </Suspense>
    )

}

export default LoginPage
