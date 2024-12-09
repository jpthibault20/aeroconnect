"use server"
import PageComponent from '@/components/dashboard/PageComponent';
import InitialLoading from '@/components/InitialLoading';
import NoClubID from '@/components/NoClubID';
import React from 'react'

interface PageProps {
    searchParams: { clubID: string | undefined };
}

const Page = async ({ searchParams }: PageProps) => {
    const clubID = searchParams.clubID;

    if (clubID) {
        return (
            <InitialLoading clubIDURL={clubID} className="h-full w-full">
                <PageComponent clubID={clubID} />
            </InitialLoading>
        )
    }
    else {
        return (
            <div className='h-full'>
                <NoClubID />
                <PageComponent clubID={""} />
            </div>
        )
    }
}

export default Page
