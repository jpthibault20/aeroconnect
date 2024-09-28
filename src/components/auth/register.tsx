"use client";

import React, { useEffect, useState } from 'react'
import CardWrapper from './cardWrapper'
import InputString from './InputString'
import ButtonForm from './buttonForm'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterSchema, registerSchema } from "../../schemas/registerSchema"; // Assure-toi que le chemin est correct  
import { signup } from '@/app/auth/login/action';

const Register = () => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const searchParams = useSearchParams(); // Utiliser le hook pour obtenir les paramètres de recherche

    useEffect(() => {
        setMessage(searchParams.get('message') ?? '');
    }, [searchParams]);


    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<RegisterSchema>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterSchema) => {
        setLoading(true);
        console.log(data);

        // Convert the data object to FormData
        const formData = new FormData();
        formData.append('name', data.name);
        formData.append('firstName', data.firstName);
        formData.append('email', data.email);
        formData.append('password', data.password);
        formData.append('phone', data.phone);

        // Logique de soumission du formulaire, comme un appel API
        await signup(formData);

        reset();
        setLoading(false);
    };
    return (
        <CardWrapper title='Créer un compte'>
            <form action="#" onSubmit={handleSubmit(onSubmit)}>
                <div className='px-8 py-4 space-y-4'>
                    <div>
                        <InputString
                            title='Prénom'
                            placeholder='John'
                            type='text'
                            register={register}
                            id='firstName'
                        />
                        {errors.firstName && <p className='text-red-500'>{errors.firstName.message}</p>}
                    </div>
                    <div>
                        <InputString
                            title='Nom'
                            placeholder='Doe'
                            type='text'
                            register={register}
                            id='name'
                        />
                        {errors.name && <p className='text-red-500'>{errors.name.message}</p>}
                    </div>
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
                    </div>
                    <div>
                        <InputString
                            title='Numéro de téléphone'
                            placeholder='******'
                            type='tel'
                            register={register}
                            id='phone'
                        />
                        {errors.phone && <p className='text-red-500'>{errors.phone.message}</p>}
                    </div>
                </div>
                <div>
                    {message && (
                        <div className="text-sm font-medium text-destructive flex justify-center">
                            {message}
                        </div>
                    )}
                </div>
                <div className='flex justify-center items-center mt-4 w-full px-8'>
                    <ButtonForm
                        title="S'inscrire"
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

export default Register
