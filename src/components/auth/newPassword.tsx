import React from 'react'
import CardWrapper from './cardWrapper'
import Link from 'next/link'

const NewPassword = () => {
    return (
        <CardWrapper title='Changer votre mot de passe'>
            new password page
            <Link
                href={'/auth/login'}
                className='flex items-center justify-center text-sm text-gray-500 hover:text-gray-700'
            >
                Se connecter
            </Link>
        </CardWrapper>
    )
}

export default NewPassword
