import React, { Suspense } from 'react'
import NewPassword from '@/components/auth/NewPassword'

const NewPasswordPage = () => {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <div>
                <NewPassword />
            </div>
        </Suspense>
    )
}

export default NewPasswordPage
