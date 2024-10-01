"use client";

import React from 'react'
import CardWrapper from './cardWrapper'
import Link from 'next/link'
import InputString from './InputString'
import ButtonForm from './buttonForm'
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { newPasswordSchema, NewPasswordSchema } from "../../schemas/newPasswordSchema"; // Assure-toi que le chemin est correct
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { resetPassword } from '../../app/auth/login/action';


const ForgotPassword = () => {
    const [loading, setLoading] = React.useState(false);

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
        console.log(data);

        // Logique de soumission du formulaire, comme un appel API
        const formData = new FormData();
        formData.append('email', data.email);
        // resetPassword(formData);

        reset();
        setLoading(false);
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
