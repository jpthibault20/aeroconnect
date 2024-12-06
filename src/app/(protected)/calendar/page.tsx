'use server';

import React from 'react';
import PageComponent from '@/components/calendar/PageComponent';
import { PrismaClient } from '@prisma/client';
import NoClubID from '@/components/NoClubID';

const prisma = new PrismaClient();

interface PageProps {
    searchParams: { clubID: string | undefined };
}

const Page = async ({ searchParams }: PageProps) => {
    const clubID = searchParams.clubID;

    // if (!clubID) {
    //     throw new Error('clubID is required in the URL');
    // }
    if (clubID) {
        const sessions = await prisma.flight_sessions.findMany({
            where: { clubID: clubID }
        });

        const planes = await prisma.planes.findMany({
            where: {
                clubID: clubID
            }
        });
        return (
            <div className='h-full'>
                <PageComponent sessionsprops={sessions} planesProp={planes} clubIDURL={clubID} />
            </div>)
    }

    return (
        <div className='h-full'>
            <NoClubID />
            <PageComponent sessionsprops={[]} planesProp={[]} clubIDURL={clubID ?? ''} />
        </div>
    )
};



export default Page;
