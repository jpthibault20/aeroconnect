"use client";

import React from 'react'
import CardWrapper from './cardWrapper'
import InputString from './InputString'
import ButtonForm from './buttonForm'
import Link from 'next/link'

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterSchema, registerSchema } from "../../schemas/registerSchema"; // Assure-toi que le chemin est correct  

const Register = () => {
    const [loading, setLoading] = React.useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<RegisterSchema>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = (data: RegisterSchema) => {
        setLoading(true);
        console.log(data);

        // Logique de soumission du formulaire, comme un appel API

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
