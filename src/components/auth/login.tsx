
"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { use } from 'react'
import InputString from './InputString';
import ButtonForm from './buttonForm'
import CardWrapper from './cardWrapper';
import Link from 'next/link';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, loginSchema } from "../../schemas/loginSchema"; // Assure-toi que le chemin est correct
import { emailLogin } from '@/app/auth/login/action';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import OauthSignin from './oauthSignin';
import { set } from 'zod';


export const Login = () => {
    const [loading, setLoading] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const [messageG, setMessageG] = React.useState('');
    const searchParams = useSearchParams(); // Utiliser le hook pour obtenir les paramètres de recherche

    useEffect(() => {
        setMessage(searchParams.get('message') ?? '');
        setMessageG(searchParams.get('messageG') ?? '');
    }, [searchParams]);



    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<LoginSchema>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginSchema) => {
        setLoading(true);
        console.log(data);

        // Convert the data object to FormData
        const formData = new FormData();
        formData.append('email', data.email);
        formData.append('password', data.password);

        // Logique de soumission du formulaire, comme un appel API
        await emailLogin(formData);

        reset();
        setLoading(false);
    };


    return (
        <CardWrapper title='Se connecter'>
            <form action="#" onSubmit={handleSubmit(onSubmit)}>
                <div className='px-8 py-4 space-y-4'>
                    <div>
                        <InputString
                            title='Email'
                            placeholder='john@doe.com'
                            type='email'
                            register={register}
                            id='email'
                        />
                        {errors.email && <p className='text-red-500'>{errors.email.message}</p>}
                    </div>

                    <div>
                        <InputString
                            title='Mot de passe'
                            placeholder='******'
                            type='password'
                            register={register}
                            id='password'
                        />
                        {errors.password && <p className='text-red-500'>{errors.password.message}</p>}
                        <Link
                            href={'/auth/newPassword'}
                            className='flex items-center justify-end mt-1 text-sm text-gray-500 hover:text-gray-700'
                        >
                            Mot de passe oublié ?
                        </Link>
                    </div>
                </div>
                <div>
                    {message && (
                        <div className="text-sm font-istok font-medium text-destructive flex justify-center">
                            {message}
                        </div>
                    )}
                    {messageG && (
                        <div className="font-istok font-medium text-green-600 flex justify-center">
                            {messageG}
                        </div>
                    )}
                </div>
                <div className='flex justify-center items-center mt-4 w-full px-8'>
                    <ButtonForm
                        title="Se connecter"
                        loading={loading}
                    />
                </div>
            </form>

            {/* <div className='px-8 mt-4'>
                <OauthSignin />
            </div> */}

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