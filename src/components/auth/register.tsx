import React from 'react'
import CardWrapper from './cardWrapper'
import InputString from './InputString'
import ButtonForm from './buttonForm'
import Link from 'next/link'

const Register = () => {
    return (
        <CardWrapper title='Créer un compte'>
            <div className='px-8 py-4 space-y-4'>
                <InputString
                    title='Prénom'
                    placeholder='John'
                    type='text'
                />
                <InputString
                    title='Nom'
                    placeholder='Doe'
                    type='text'
                />
                <InputString
                    title='Email'
                    placeholder='john@doe.com'
                    type='email'
                />
                <InputString
                    title='Mot de passe'
                    placeholder='******'
                    type='password'
                />
                <InputString
                    title='Numéro de téléphone'
                    placeholder='******'
                    type='tel'
                />
            </div>
            <div className='flex justify-center items-center mt-4 w-full px-8'>
                <ButtonForm
                    title="S'inscrire"
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

export default Register
