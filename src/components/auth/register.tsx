"use client";

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterSchema, registerSchema } from "../../schemas/registerSchema"; // Assure-toi que le chemin est correct  
import { emailSignup } from '@/app/auth/login/action';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import Image from 'next/image';
import { Spinner } from '../ui/SpinnerVariants';
import { Logo } from '../Logo';

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
        try {
            const formData = new FormData();
            formData.append('lastName', data.lastName);
            formData.append('firstName', data.firstName);
            formData.append('email', data.email);
            formData.append('password', data.password);
            formData.append('phone', data.phone);

            // Logique de soumission du formulaire, comme un appel API
            await emailSignup(formData);

        } catch (error) {
            console.log(error);
        } finally {
            reset();
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col lg:flex-row">
            {/* Left Section */}
            <div className="relative hidden lg:flex lg:w-1/2 bg-purple-500">
                <div className="absolute inset-0">
                    <Image
                        src="/images/bgLoginPages.svg"
                        alt="Background"
                        fill
                        className="object-cover "
                        priority
                    />
                </div>
            </div>

            {/* Right Section */}
            <div className="flex-1 flex flex-col lg:w-1/2">
                <div className="flex justify-end p-4">
                    <Link
                        href="https://www.aeroconnect.fr"
                        className="text-sm text-purple-600 hover:text-purple-500 flex items-center gap-2"
                    >
                        Retour au site
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M6 12L10 8L6 4"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </Link>
                </div>

                <div className='lg:hidden'>
                    <Logo />
                </div>

                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="w-full max-w-md space-y-8">
                        <div className='hidden lg:flex lg:flex-col lg:items-center'>
                            <h1 className='text-black font-thin  text-4xl'>
                                Aéro Connect
                            </h1>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold">Créer un compte</h1>
                            <p className="text-gray-500">
                                Déjà inscrit ?{" "}
                                <Link href="/auth/login" className="text-purple-600 hover:text-purple-500">
                                    Se connecter
                                </Link>
                            </p>
                        </div>

                        <form className="space-y-4" action="#" onSubmit={handleSubmit(onSubmit)}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="firstname" className="text-sm font-medium">
                                        Prénom
                                    </label>
                                    <Input
                                        id="firstname"
                                        placeholder="Entrez votre prénom"
                                        className="bg-gray-50"
                                        {...register("firstName")}
                                    />
                                    {errors.firstName && <p className='text-red-500'>{errors.firstName.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="lastname" className="text-sm font-medium">
                                        Nom
                                    </label>
                                    <Input
                                        id="lastname"
                                        placeholder="Entrez votre nom"
                                        className="bg-gray-50"
                                        {...register("lastName")}
                                    />
                                    {errors.lastName && <p className='text-red-500'>{errors.lastName.message}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium">
                                    Email
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="nom@exemple.com"
                                    className="bg-gray-50"
                                    {...register("email")}
                                />
                                {errors.email && <p className='text-red-500'>{errors.email.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="phone" className="text-sm font-medium">
                                    Téléphone
                                </label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="06 12 34 56 78"
                                    className="bg-gray-50"
                                    {...register("phone")}
                                />
                                {errors.phone && <p className='text-red-500'>{errors.phone.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium">
                                    Mot de passe
                                </label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Créez votre mot de passe"
                                    className="bg-gray-50"
                                />
                                {errors.password && <p className='text-red-500'>{errors.password.message}</p>}
                            </div>

                            <div>
                                {message && (
                                    <div className="text-sm font-medium text-destructive flex justify-center">
                                        {message}
                                    </div>
                                )}
                            </div>

                            <Button
                                variant="perso"
                                className='w-full bg-purple-600 hover:bg-purple-700'
                                type='submit'
                                disabled={loading}
                            >
                                {loading ? <Spinner className='text-white' /> : "Créer un compte"}
                            </Button>

                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Register
