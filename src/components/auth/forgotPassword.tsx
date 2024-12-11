"use client";

import React, { useEffect } from 'react'
import Link from 'next/link'
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { newPasswordSchema, NewPasswordSchema } from "../../schemas/newPasswordSchema"; // Assure-toi que le chemin est correct
import { forgotPassword } from '../../app/auth/login/action';
import { useSearchParams } from 'next/navigation';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Logo } from '../Logo';
import Image from 'next/image';
import { Spinner } from '../ui/SpinnerVariants';


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
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
                            <p className="text-gray-500">
                                Entrez votre adresse e-mail pour réinitialiser votre mot de passe
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

                            <Button
                                variant="perso"
                                className='w-full bg-purple-600 hover:bg-purple-700'
                                type='submit'
                                disabled={loading}
                            >
                                {loading ? <Spinner className='text-white' /> : "Envoyer le lien de réinitialisation"}
                            </Button>

                            <div className="text-center">
                                <Link href="/auth/login" className="text-sm text-purple-600 hover:text-purple-500">
                                    Retour à la connexion
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ForgotPassword
