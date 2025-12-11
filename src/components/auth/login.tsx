"use client";

import React from 'react';
import Link from 'next/link';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, loginSchema } from "../../schemas/loginSchema"; // Assure-toi que le chemin est correct
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Logo } from '../Logo';
import Image from "next/image";
import { Spinner } from '../ui/SpinnerVariants';
import { Eye, EyeOff } from 'lucide-react';
import { Label } from '../ui/label';
import { login } from "@/app/auth/login/action"
import { isRedirectError } from 'next/dist/client/components/redirect-error';

export const Login = () => {
    const [loading, setLoading] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const [messageG, setMessageG] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false); // État pour la visibilité du mot de passe
    const searchParams = useSearchParams(); // Utiliser le hook pour obtenir les paramètres de recherche
    const router = useRouter();

    // Précharge la page de destination
    useEffect(() => {
        router.prefetch('/Calendar'); // Ou ta page de destination
    }, [router]);
    useEffect(() => {
        setMessage(searchParams.get('message') ?? '');
        setMessageG(searchParams.get('messageG') ?? '');
        // setLoading(false); // Réinitialiser le loading à false après avoir récupéré les paramètres de recherche
    }, [searchParams]);

    const {
        register,
        handleSubmit,
        formState: { errors },
        // reset,
    } = useForm<LoginSchema>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginSchema) => {
        setLoading(true);
        setMessage("");
        setMessageG("");

        try {
            const formData = new FormData();
            formData.append('email', data.email);
            formData.append('password', data.password);

            // 1. On stocke le résultat de l'action
            const res = await login(formData);

            // 2. On vérifie si l'action a retourné une erreur "logique" (mauvais mdp, etc.)
            // Note: Si 'res' existe, c'est que le redirect n'a PAS eu lieu (car redirect lance une erreur)
            if (res && !res.success) {
                console.log("Erreur logique détectée:", res.message);
                setMessage(res.message || "Erreur de connexion");
                setLoading(false); // ICI : On arrête le spinner car l'utilisateur doit réessayer
                return;
            }

        } catch (error) {
            // 3. Gestion de la redirection (SUCCÈS)
            // La fonction `redirect()` de Next.js lance une erreur spéciale de type NEXT_REDIRECT
            if (isRedirectError(error)) {
                // C'est le signe que tout a marché !
                // On NE met PAS setLoading(false) ici.
                // On laisse le spinner tourner pendant que la page change.
                throw error;
            }

            // 4. Gestion des vrais crashs techniques (Bug code, serveur down...)
            console.error("Erreur technique :", error);
            setLoading(false); // On arrête le spinner
            setMessage("Une erreur inattendue est survenue.");
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col lg:flex-row">
            {/* Left Section */}
            <div className="relative hidden lg:flex lg:w-1/2 ">
                <div className="absolute inset-0">
                    <Image
                        src="/images/bgLoginPages.svg"
                        alt="Background"
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
            </div>

            {/* Right Section */}
            <div className="flex-1 flex flex-col lg:w-1/2 px-3">
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

                <div className="flex-1 flex items-center justify-center">
                    <div className="w-full max-w-md space-y-8">
                        <div className='hidden lg:flex lg:flex-col lg:items-center'>
                            <h1 className='text-black font-thin text-4xl'>
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
                                <Label htmlFor="email" className="text-sm font-medium">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="nom@exemple.com"
                                    className="bg-gray-50"
                                    autoComplete='email'
                                    {...register("email")}
                                />
                                {errors.email && <p className='text-red-500'>{errors.email.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium">
                                    Mot de passe
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="******"
                                        className="bg-gray-50"
                                        autoComplete='current-password'
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
                                    {/* <Checkbox id="remember" />
                                    <Label
                                        htmlFor="remember"
                                        className="text-sm text-gray-500 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Se souvenir de moi
                                    </Label> */}
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
};
