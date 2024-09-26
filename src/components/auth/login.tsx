import React from 'react'
import InputString from './InputString';
import ButtonForm from './buttonForm'
import CardWrapper from './cardWrapper';
import Link from 'next/link';

export const Login = () => {
    return (
        <CardWrapper title='Se connecter'>
            <div className='px-8 py-4 space-y-4'>
                <InputString
                    title='Email'
                    placeholder='john@doe.com'
                    type='email'
                />
                <div>
                    <InputString
                        title='Mot de passe'
                        placeholder='******'
                        type='password'
                    />
                    <Link
                        href={'/auth/newPassword'}
                        className='flex items-center justify-end mt-1 text-sm text-gray-500 hover:text-gray-700'
                    >
                        Mot de passe oublié ?
                    </Link>
                </div>

            </div>
            <div className='flex justify-center items-center mt-4 w-full px-8'>
                <ButtonForm
                    title="Se connecter"
                />
            </div>
            <div className='mt-10'>
                <Link
                    href={'/auth/register'}
                    className='flex items-center justify-center text-sm text-gray-500 hover:text-gray-700'
                >
                    S&apos;inscrire
                </Link>
            </div>
        </CardWrapper>
    );
}