"use client";
import React, { useEffect } from 'react'
import CardWrapper from './cardWrapper'
import InputString from './InputString'
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updatePasswordSchema, UpdatePasswordSchema } from '../../schemas/newPasswordSchema';
import ButtonForm from './buttonForm';
import Link from 'next/link';
import { updatePassword } from '@/app/auth/login/action';
import { useSearchParams } from 'next/navigation';

const NewPassword = () => {
    const [loading, setLoading] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const [messageG, setMessageG] = React.useState('');
    const [code, setCode] = React.useState('');
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
        <CardWrapper title='Votre nouveau mot de passe'>
            <form action="#" onSubmit={handleSubmit(onSubmit)}>
                <div className='px-8 py-4 space-y-3'>
                    <InputString
                        title='password'
                        placeholder='******'
                        type='password'
                        register={register}
                        id='password'
                    />
                    {errors.password && <p className='text-red-500'>{errors.password.message}</p>}
                    <div>
                        <InputString
                            title='confirmPassword'
                            placeholder='******'
                            type='password'
                            register={register}
                            id='confirmPassword'
                        />
                        {errors.confirmPassword && <p className='text-red-500'>{errors.confirmPassword.message}</p>}
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

export default NewPassword
