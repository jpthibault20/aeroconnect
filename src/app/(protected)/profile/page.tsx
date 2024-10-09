"use client"
import { signOut } from '@/app/auth/login/action'
import { useCurrentUser } from '@/app/context/useCurrentUser'
import InitialLoading from '@/components/InitialLoading'
import { Button } from '@/components/ui/button'
import React from 'react'

const Page = () => {
    const { currentUser } = useCurrentUser();
    return (
        <InitialLoading>
            <div className='justify-center items-center h-full flex'>
                <div>
                    <p className='text-2xl font-istok'>
                        profile page
                    </p>
                    Hello {currentUser?.firstName} {currentUser?.lastName}
                    <br />
                    Email : {currentUser?.email}
                    <br />
                    Phone : {currentUser?.phone}
                    <br />
                    Id : {currentUser?.id}
                    <br />
                    Club : {currentUser?.clubID}
                    <br />
                    Role : {currentUser?.role}
                    <br />
                    Restrein : {currentUser?.restricted ? "oui" : "non"}
                    <div className='lg:hidden'>
                        <Button
                            className=''
                            onClick={() => signOut()}>
                            Déconnexion
                        </Button>
                    </div>
                </div>
            </div>
        </InitialLoading>
    )
}

export default Page
