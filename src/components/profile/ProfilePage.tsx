"use client";

import React, { useState } from 'react';
import InputComponent from './InputComponent';
import { Button } from '../ui/button';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileSchema, UpdateProfileSchema } from '../../schemas/updateProfil'; // Assurez-vous que le chemin est correct
import { useCurrentUser } from '@/app/context/useCurrentUser';
import PhoneLogoutButton from './PhoneLogoutButton';

const ProfilePage = () => {
    const [loading, setLoading] = useState(false);
    const { currentUser } = useCurrentUser();

    const {
        handleSubmit,
        register,
        formState: { errors },
        reset,
    } = useForm<UpdateProfileSchema>({
        resolver: zodResolver(updateProfileSchema),
        values: {
            firstName: currentUser?.firstName || '',
            lastName: currentUser?.lastName || '',
            email: currentUser?.email || '',
            phone: currentUser?.phone || '',
            adress: "29 rue du moulin",
            city: "Alaincourt la cote",
            zipCode: "57590",
            country: "France"
        }
    });

    const onSubmit = async (data: UpdateProfileSchema) => {
        setLoading(true);
        console.log(data); // Affichez les données dans la console ou envoyez-les à votre API

        // Réinitialisez le formulaire après soumission
        reset();
        setLoading(false);
    };

    const onClickResetPassword = () => {
        console.log('Reset password');
    };

    return (
        <div className="h-full bg-gray-100 font-istok p-6 space-y-6 max-h-[100vh] overflow-y-auto pb-20">
            <div className='flex flex-col justify-between items-center space-y-3'>
                <h2 className='text-4xl font-semibold'>Profil</h2>
                <p className='text-gray-600'>Vos informations personnelles</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className='w-full flex flex-col justify-center items-center'>
                    <div className='w-fit border-t border-gray-300 py-6 px-6 space-y-3'>
                        <div className='grid grid-cols-2 gap-6'>
                            <div>
                                <InputComponent
                                    title='Prénom'
                                    type='text'
                                    id='firstName'
                                    value={currentUser?.firstName}
                                    disabled={loading}
                                    register={register}
                                />
                                {errors.firstName && <p className='text-red-500'>{errors.firstName.message}</p>}
                            </div>
                            <div>
                                <InputComponent
                                    title='Nom'
                                    type='text'
                                    id='lastName'
                                    value={currentUser?.lastName}
                                    disabled={loading}
                                    register={register}
                                />
                                {errors.lastName && <p className='text-red-500'>{errors.lastName.message}</p>}
                            </div>
                        </div>
                        <div className='grid grid-cols-1 gap-3'>
                            <div>
                                <InputComponent
                                    title='Email'
                                    type='email'
                                    id='email'
                                    value={currentUser?.email}
                                    disabled={loading}
                                    register={register}
                                />
                                {errors.email && <p className='text-red-500'>{errors.email.message}</p>}
                            </div>
                            <div>
                                <InputComponent
                                    title='Téléphone'
                                    type='tel'
                                    id='phone'
                                    value={currentUser?.phone}
                                    disabled={loading}
                                    register={register}
                                />
                                {errors.phone && <p className='text-red-500'>{errors.phone.message}</p>}
                            </div>
                            <div>
                                <InputComponent
                                    title='Adresse'
                                    type='text'
                                    id='adress'
                                    value={"29 rue du moulin"}
                                    disabled={loading}
                                    register={register}
                                />
                                {errors.adress && <p className='text-red-500'>{errors.adress.message}</p>}
                            </div>
                        </div>
                        <div className='grid grid-cols-2 gap-3'>
                            <div>
                                <InputComponent
                                    title='Ville'
                                    type='text'
                                    id='city'
                                    value={"Alaincourt la cote"}
                                    disabled={loading}
                                    register={register}
                                />
                                {errors.city && <p className='text-red-500'>{errors.city.message}</p>}
                            </div>
                            <div>
                                <InputComponent
                                    title='Code postal'
                                    type='text'
                                    id='zipCode'
                                    value={"57590"}
                                    disabled={loading}
                                    register={register}
                                />
                                {errors.zipCode && <p className='text-red-500'>{errors.zipCode.message}</p>}
                            </div>
                        </div>
                        <div className='grid grid-cols-1 gap-3'>
                            <div>
                                <InputComponent
                                    title='Pays'
                                    type='text'
                                    id='country'
                                    value={"France"}
                                    disabled={loading}
                                    register={register}
                                />
                                {errors.country && <p className='text-red-500'>{errors.country.message}</p>}
                            </div>
                        </div>
                        <div className='grid grid-cols-1 gap-3 pb-3'>
                            <div>
                                <p>
                                    Mot de passe
                                </p>
                                <Button className=' bg-[#774BBE] hover:bg-[#3d2365]' type='button' disabled={loading} onClick={onClickResetPassword}>
                                    Réinitialiser le mot de passe
                                </Button>
                            </div>
                        </div>
                        <div className='justify-end items-end flex w-full border-t border-gray-300'>
                            <Button className='mt-6 bg-[#774BBE] hover:bg-[#3d2365]' type='submit' disabled={loading}>
                                Enregistrer
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
            <div>
                <PhoneLogoutButton />
            </div>
        </div>
    );
}

export default ProfilePage;
