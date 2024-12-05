"use server"
import PageComponent from '@/components/dashboard/PageComponent';
import NoClubID from '@/components/NoClubID';
import React from 'react'

interface PageProps {
    searchParams: { clubID: string | undefined };
}

const Page = async ({ searchParams }: PageProps) => {
    const clubID = searchParams.clubID;

    if (clubID) {
        return (
            <PageComponent clubID={clubID} />
        )
    }
    else {
        return (
            <NoClubID />
        )
    }
}

export default Page
