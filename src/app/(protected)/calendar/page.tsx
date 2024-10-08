"use client"
import React from 'react'
import { useCurrentUser } from '@/app/context/useCurrentUser'


const Page = () => {
    const { currentUser } = useCurrentUser();

    if (currentUser === undefined) {
        return <div>Loading...</div>;
    }

    return (
        <div className='flex flex-col justify-center items-center'>
            <p className='text-2xl font-istok'>Calendar</p>
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
        </div>
    )
}

export default Page
