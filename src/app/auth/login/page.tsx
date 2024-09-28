"use client";
import { Login } from '@/components/auth/login'
import React, { Suspense } from 'react'

const LoginPage = () => {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <div className="">
                <Login />
            </div>
        </Suspense>
    )
}

export default LoginPage
