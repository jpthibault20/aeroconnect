"use server"
import InitialLoading from '@/components/InitialLoading'
import ProfilePage from '@/components/profile/ProfilePage'
import React from 'react'

interface PageProps {
    searchParams: Promise<{ [clubID: string]: string | string[] | undefined }>
}

const Page = async ({ searchParams }: PageProps) => {
    const { clubID: ClubIDprop } = await searchParams

    const clubID = Array.isArray(ClubIDprop) ? ClubIDprop[0] : ClubIDprop;

    return (
        <InitialLoading className='h-full w-full' clubIDURL={clubID ?? ''}>
            <ProfilePage />
        </InitialLoading>
    )
}

export default Page
