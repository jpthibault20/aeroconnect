
"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react'
import Link from 'next/link';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, loginSchema } from "../../schemas/loginSchema"; // Assure-toi que le chemin est correct
import { emailLogin } from '@/app/auth/login/action';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Logo } from '../Logo';
import Image from "next/image"
import { Spinner } from '../ui/SpinnerVariants';

export const Login = () => {
    const [loading, setLoading] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const [messageG, setMessageG] = React.useState('');
    const searchParams = useSearchParams(); // Utiliser le hook pour obtenir les paramètres de recherche

    useEffect(() => {
        setMessage(searchParams.get('message') ?? '');
        setMessageG(searchParams.get('messageG') ?? '');
        setLoading(false) // Réinitialiser le loading à false après avoir récupéré les paramètres de recherche
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
        setLoading(true); // Activation de l'état de chargement
        try {
            const formData = new FormData();
            formData.append('email', data.email);
            formData.append('password', data.password);

            // Appel API de connexion
            await emailLogin(formData);

        } catch (error) {
            console.error("Erreur de connexion :", error);
        } finally {
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
                {/* <div className="w-full h-full grid grid-rows-3 items-center justify-center">
                    <div className="row-start-1"></div>
                    <div className="row-start-2"></div>
                    <div className="row-start-3 text-center text-black font-istok">
                        <h1 className='text-black font-istok text-5xl'>
                            <span className='font-bold'>A</span>ero
                            {" "}
                            <span className='font-bold'>C</span>onnect
                        </h1>
                    </div>
                </div> */}
            </div>

            {/* Right Section */}
            <div className="flex-1 flex flex-col lg:w-1/2">
                <div className="flex justify-end p-4">
                    <Link
                        href="#"
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

                <div className="flex-1 flex items-center justify-center">
                    <div className="w-full max-w-md space-y-8">
                        <div className='hidden lg:flex lg:flex-col lg:items-center'>
                            <h1 className='text-black font-thin  text-4xl'>
                                Aéro Connect
                            </h1>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold">Connexion</h1>
                            <p className="text-gray-500">
                                Pas encore de compte ?{" "}
                                <Link href="/auth/register" className="text-purple-600 hover:text-purple-500">
                                    S&apos;inscrire
                                </Link>
                            </p>
                        </div>

                        <form className="space-y-4" action="#" onSubmit={handleSubmit(onSubmit)}>
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
                                <label htmlFor="password" className="text-sm font-medium">
                                    Mot de passe
                                </label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="******"
                                    className="bg-gray-50"
                                    {...register("password")}
                                />
                                {errors.password && <p className='text-red-500'>{errors.password.message}</p>}
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
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="remember" />
                                    <label
                                        htmlFor="remember"
                                        className="text-sm text-gray-500 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Se souvenir de moi
                                    </label>
                                </div>
                                <Link href={'/auth/forgotPassword'} className="text-sm text-purple-600 hover:text-purple-500">
                                    Mot de passe oublié ?
                                </Link>
                            </div>

                            <Button
                                variant="perso"
                                className='w-full bg-purple-600 hover:bg-purple-700'
                                type='submit'
                                disabled={loading}
                            >
                                {loading ? <Spinner className='text-white' /> : "Se connecter"}
                            </Button>

                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}