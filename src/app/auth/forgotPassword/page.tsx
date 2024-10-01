import React, { Suspense } from 'react'
import ForgotPassword from '../../../components/auth/forgotPassword'

const ForgotPasswordPage = () => {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ForgotPassword />
        </Suspense>
    )
}

export default ForgotPasswordPage
