import React from 'react'
import CardWrapper from './cardWrapper'
import Link from 'next/link'
import InputString from './InputString'
import ButtonForm from './buttonForm'

const NewPassword = () => {
    return (
        <CardWrapper title='Changer votre mot de passe'>
            <div className='px-8 py-4 space-y-4'>
                <InputString
                    title='Email'
                    placeholder='John@doe.com'
                    type='email'
                />
            </div>
            <div className='flex justify-center items-center mt-4 w-full px-8'>
                <ButtonForm
                    title="Reinitialiser mon mot de passe"
                />
            </div>
            <div className='mt-10'>
                <Link
                    href={'/auth/login'}
                    className='flex items-center justify-center text-sm text-gray-500 hover:text-gray-700'
                >
                    Se connecter
                </Link>
            </div>
        </CardWrapper>
    )
}

export default NewPassword
