"use client"
import React, { useState } from 'react'
import { useCurrentUser } from '@/app/context/useCurrentUser'
import PhoneLogoutButton from './PhoneLogoutButton'
import InputComponent from './InputComponent'
import { Button } from '../ui/button'


const ProfilePage = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [loading, setLoading] = useState(false)
    const { currentUser } = useCurrentUser()

    return (
        <div className="h-full bg-gray-100 font-istok p-6 space-y-6 max-h-[100vh] overflow-y-auto pb-20">
            <div className='flex flex-col justify-between items-center space-y-3'>
                <h2 className='text-4xl font-semibold'>
                    Profil
                </h2>
                <p className='text-gray-600'>
                    Vos informations personnelles
                </p>
            </div>

            <div className='w-full flex flex-col justify-center items-center'>
                <div className='w-fit border-t border-gray-300 py-6 px-6 space-y-3'>
                    <div className='grid grid-cols-2 gap-6'>
                        <InputComponent
                            title={'Prénom'}
                            defaultValue={currentUser?.firstName}
                            htmlFor={'firstName'}
                            type={'text'}
                            id={'firstName'}
                            disabled={loading}
                        />
                        <InputComponent
                            title={'Nom'}
                            defaultValue={currentUser?.lastName}
                            htmlFor={'lastName'}
                            type={'text'}
                            id={'lastName'}
                            disabled={loading}
                        />
                    </div>
                    <div className='grid grid-cols-1 gap-3'>
                        <InputComponent
                            title={'Email'}
                            defaultValue={currentUser?.email}
                            htmlFor={'email'}
                            type={'text'}
                            id={'email'}
                            disabled={loading}
                        />
                        <InputComponent
                            title={'Téléphone'}
                            defaultValue={currentUser?.phone}
                            htmlFor={'phone'}
                            type={'text'}
                            id={'phone'}
                            disabled={loading}
                        />
                        <InputComponent
                            title={'Adresse'}
                            defaultValue={"29 rue du moulin"}
                            htmlFor={'adress'}
                            type={'text'}
                            id={'adress'}
                            disabled={loading}
                        />
                    </div>
                    <div className='grid grid-cols-2 gap-3'>
                        <InputComponent
                            title={'Ville'}
                            defaultValue={"Alaincourt la cote"}
                            htmlFor={'city'}
                            type={'text'}
                            id={'city'}
                            disabled={loading}
                        />
                        <InputComponent
                            title={'Code postal'}
                            defaultValue={"57590"}
                            htmlFor={'zipCode'}
                            type={'text'}
                            id={'zipCode'}
                            disabled={loading}
                        />
                    </div>
                    <div className='grid grid-cols-1 gap-3'>
                        <InputComponent
                            title={'Pays'}
                            defaultValue={"France"}
                            htmlFor={'countrie'}
                            type={'text'}
                            id={'countrie'}
                            disabled={loading}
                        />
                    </div>
                    <div className='grid grid-cols-2 gap-3 pb-3'>
                        <InputComponent
                            title={'Mot de passe'}
                            defaultValue={"123456"}
                            htmlFor={'password'}
                            type={'password'}
                            id={'password'}
                            disabled={loading}
                        />
                        <InputComponent
                            title={'Confirmation'}
                            defaultValue={"123456"}
                            htmlFor={'confirmPassword'}
                            type={'password'}
                            id={'confirmPassword'}
                            disabled={loading}
                        />
                    </div>
                    <div className='justify-end items-end flex w-full border-t border-gray-300'>
                        <Button className='mt-6'>
                            Enregistrer
                        </Button>
                    </div>
                </div>
            </div>





            <div>
                <PhoneLogoutButton />
            </div>
        </div>
    )
}

export default ProfilePage
