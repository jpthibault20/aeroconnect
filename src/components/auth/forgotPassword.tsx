"use client";

import React, { useEffect } from 'react'
import CardWrapper from './cardWrapper'
import Link from 'next/link'
import InputString from './InputString'
import ButtonForm from './buttonForm'
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { newPasswordSchema, NewPasswordSchema } from "../../schemas/newPasswordSchema"; // Assure-toi que le chemin est correct
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { forgotPassword } from '../../app/auth/login/action';
import { useSearchParams } from 'next/navigation';


const ForgotPassword = () => {
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
    } = useForm<NewPasswordSchema>({
        resolver: zodResolver(newPasswordSchema),
    });

    const onSubmit = (data: NewPasswordSchema) => {
        setLoading(true);

        try {
            // Logique de soumission du formulaire, comme un appel API
            const formData = new FormData();
            formData.append('email', data.email);
            forgotPassword(formData);


        } catch (error) {
            console.log(error);
        } finally {
            reset();

        }
    };

    return (
        <CardWrapper title='Changer votre mot de passe'>
            <form action="#" onSubmit={handleSubmit(onSubmit)}>
                <div className='px-8 py-4'>
                    <InputString
                        title='Email'
                        placeholder='John@doe.com'
                        type='email'
                        register={register}
                        id='email'
                    />
                    {errors.email && <p className='text-red-500'>{errors.email.message}</p>}
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
                        title="Reinitialiser mon mot de passe"
                        loading={loading}
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
            </form>
        </CardWrapper>
    )
}

export default ForgotPassword
