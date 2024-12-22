"use client";
import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updatePasswordSchema, UpdatePasswordSchema } from '../../schemas/newPasswordSchema';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Logo } from '../Logo';
import Image from 'next/image';
import { Spinner } from '../ui/SpinnerVariants';
import { Eye, EyeOff } from 'lucide-react';
import { updatePassword } from '@/app/auth/newPassword/action';

const NewPassword = () => {
    const [loading, setLoading] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const [messageG, setMessageG] = React.useState('');
    const [code, setCode] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false); // État pour la visibilité du mot de passe
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false); // État pour la visibilité du mot de passe
    const searchParams = useSearchParams(); // Utiliser le hook pour obtenir les paramètres de recherche

    useEffect(() => {
        setMessage(searchParams.get('message') ?? '');
        setMessageG(searchParams.get('messageG') ?? '');
        setCode(searchParams.get('code') ?? '');
    }, [searchParams]);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<UpdatePasswordSchema>({
        resolver: zodResolver(updatePasswordSchema),
    });

    const onSubmit = (data: UpdatePasswordSchema) => {
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('password', data.password);
            formData.append('confirmPassword', data.confirmPassword);
            formData.append('code', code);

            updatePassword(formData);


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
                            <h1 className="text-2xl font-bold">Créer un nouveau mot de passe</h1>
                            <p className="text-gray-500">
                                Veuillez entrer votre nouveau mot de passe ci-dessous
                            </p>
                        </div>

                        <form className="space-y-4" action="#" onSubmit={handleSubmit(onSubmit)}>
                            <div className="space-y-2">
                                <label htmlFor="new-password" className="text-sm font-medium">
                                    Nouveau mot de passe
                                </label>

                                <div className="relative">
                                    <Input
                                        id="new-password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="******"
                                        className="bg-gray-50"
                                        autoComplete='new-password'
                                        {...register("password")}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                {errors.password && <p className='text-red-500'>{errors.password.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="confirm-password" className="text-sm font-medium">
                                    Confirmer le mot de passe
                                </label>
                                <div className="relative">
                                    <Input
                                        id="confirm-password"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="******"
                                        className="bg-gray-50"
                                        {...register("confirmPassword")}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.confirmPassword && <p className='text-red-500'>{errors.confirmPassword.message}</p>}
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
                                {loading ? <Spinner className='text-white' /> : "Réinitialiser le mot de passe"}
                            </Button>

                            <div className="text-center">
                                <Link href="/auth/login" type='button' className="text-sm text-purple-600 hover:text-purple-500">
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

export default NewPassword
