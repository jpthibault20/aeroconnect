"use client";

import React, { useState } from 'react';
import InputComponent from './InputComponent';
import { Button } from '../ui/button';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import PhoneLogoutButton from './PhoneLogoutButton';
import { User, userRole } from '@prisma/client';
import { updateUser } from '@/api/db/users';
import { toast } from '@/hooks/use-toast';

const ProfilePage = () => {
    const [loading, setLoading] = useState(false);
    const { currentUser } = useCurrentUser();

    const [userState, setUserState] = useState<User>({
        id: currentUser?.id || '',
        firstName: currentUser?.firstName || '',
        lastName: currentUser?.lastName || '',
        email: currentUser?.email || '',
        phone: currentUser?.phone || null,
        adress: currentUser?.adress || null,
        city: currentUser?.city || null,
        zipCode: currentUser?.zipCode || null,
        role: currentUser?.role || userRole.USER,
        clubID: currentUser?.clubID || '',
        restricted: currentUser?.restricted || false,
        country: currentUser?.country || null,
    })

    const onChangeUserState = (key: keyof typeof userState, value: string | boolean) => {
        setUserState((prev) => ({
            ...prev,
            [key]: value,
        }))
    }

    const onClickSubmit = () => {
        const updateUserAction = async () => {
            setLoading(true);
            try {
                const res = await updateUser(userState);
                if (res.success) {
                    setLoading(false);
                    toast({
                        title: "Utilisateur mis à jour avec succès",
                    });

                }
                if (res.error) {
                    console.log(res.error);
                    setLoading(false);
                    toast({
                        title: " Oups, une erreur est survenue",
                    });
                }
            } catch (error) {
                console.log(error);
            }
        }
        updateUserAction();
    }

    return (
        <div className="h-full bg-gray-100 font-istok p-6 space-y-6 max-h-[100vh] overflow-y-auto pb-20">
            <div className='flex flex-col justify-between items-center space-y-3'>
                <h2 className='text-4xl font-semibold'>Profil</h2>
                <p className='text-gray-600'>Vos informations personnelles</p>
            </div>

            <div className='w-full flex justify-center items-center border-t border-gray-300 pt-3'>
                <div className='w-5/6 lg:w-1/2 h-fit flex flex-col justify-center items-center space-y-6'>
                    {/* firstname lastname */}
                    <div className='grid grid-cols-2 items-center gap-6 w-full'>
                        <InputComponent
                            id='firstName'
                            label='Prénom'
                            value={userState.firstName}
                            loading={loading}
                            onChange={(value) => onChangeUserState('firstName', value)}
                            style='grid items-center gap-2'
                        />
                        <InputComponent
                            id='lastName'
                            label='Nom'
                            value={userState.lastName}
                            loading={loading}
                            onChange={(value) => onChangeUserState('lastName', value)}
                            style='grid items-center gap-2'
                        />
                    </div>

                    {/* email */}
                    <div className='grid grid-cols-1 items-center gap-6 w-full'>
                        <InputComponent
                            id='email'
                            label='Email'
                            value={userState.email}
                            loading={loading}
                            onChange={(value) => onChangeUserState('email', value)}
                            style='grid items-center gap-2'
                        />
                    </div>

                    {/* phone */}
                    <div className='grid grid-cols-1 items-center gap-6 w-full'>
                        <InputComponent
                            id='phone'
                            label='Téléphone'
                            value={userState.phone}
                            loading={loading}
                            onChange={(value) => onChangeUserState('phone', value)}
                            style='grid items-center gap-2'
                        />
                    </div>

                    {/* adresse */}
                    <div className='grid grid-cols-1 items-center gap-6 w-full'>
                        <InputComponent
                            id='adress'
                            label='Adresse'
                            value={userState.adress}
                            loading={loading}
                            onChange={(value) => onChangeUserState('adress', value)}
                            style='grid items-center gap-2'
                        />
                    </div>

                    {/* City zipcode */}
                    <div className='grid grid-cols-2 items-center gap-6 w-full'>
                        <InputComponent
                            id='city'
                            label='Ville'
                            value={userState.city}
                            loading={loading}
                            onChange={(value) => onChangeUserState('city', value)}
                            style='grid items-center gap-2'
                        />
                        <InputComponent
                            id='zipCode'
                            label='Code postal'
                            value={userState.zipCode}
                            loading={loading}
                            onChange={(value) => onChangeUserState('zipCode', value)}
                            style='grid items-center gap-2'
                        />
                    </div>

                    {/* Country */}
                    <div className='grid grid-cols-1 items-center gap-6 w-full'>
                        <InputComponent
                            id='country'
                            label='Pays'
                            value={userState.country}
                            loading={loading}
                            onChange={(value) => onChangeUserState('country', value)}
                            style='grid items-center gap-2'
                        />
                    </div>
                </div>
            </div>

            <div className='justify-between lg:justify-end items-end flex w-full border-t border-gray-300'>
                <PhoneLogoutButton style='' />
                <Button className='mt-6 bg-[#774BBE] hover:bg-[#3d2365]' disabled={loading} onClick={onClickSubmit}>
                    Enregistrer
                </Button>
            </div>
        </div >
    );
}

export default ProfilePage;
