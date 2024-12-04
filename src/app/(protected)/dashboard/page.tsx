"use server"
import PageComponent from '@/components/dashboard/PageComponent';
import React from 'react'

interface PageProps {
    searchParams: { clubID: string | undefined };
}

const Page = async ({ searchParams }: PageProps) => {
    const clubID = searchParams.clubID;

    if (!clubID) {
        throw new Error('clubID is required in the URL');
    }
    return (
        <PageComponent clubID={clubID} />
    )
}

export default Page
