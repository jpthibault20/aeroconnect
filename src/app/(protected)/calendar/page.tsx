"use client"
import React from 'react'
import { Button } from '@/components/ui/button'
import { signOut } from '@/app/auth/login/action'
import { useCurrentUser } from '@/app/context/useCurrentUser'


const Page = () => {
    const { currentUser } = useCurrentUser();

    if (currentUser === undefined) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <form action={signOut}>
                <p className='text-2xl font-istok'>homePage</p>
                <p>
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

                </p>
                <Button>Sign out</Button>
            </form>
            <div>
            </div>
        </div>
    )
}

export default Page
