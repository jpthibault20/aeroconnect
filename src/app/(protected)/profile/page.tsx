"use server"
import InitialLoading from '@/components/InitialLoading'
import ProfilePage from '@/components/profile/ProfilePage'
import React from 'react'

interface PageProps {
    searchParams: { clubID: string | undefined };
}

const Page = async ({ searchParams }: PageProps) => {
    const clubID = searchParams.clubID;

    return (
        <InitialLoading className='h-full w-full' clubIDURL={clubID ?? ''}>
            <ProfilePage />
        </InitialLoading>
    )
}

export default Page
