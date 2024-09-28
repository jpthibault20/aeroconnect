import React, { Suspense } from 'react'
import Register from '@/components/auth/register'

const RegisterPage = () => {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Register />
        </Suspense>
    )
}

export default RegisterPage
