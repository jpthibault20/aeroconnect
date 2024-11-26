'use server';

import React from 'react';
import { PrismaClient } from '@prisma/client';
import FlightsPageComponent from '@/components/flights/FlightsPageComponent';
import InitialLoading from '@/components/InitialLoading';

const prisma = new PrismaClient();

interface PageProps {
    searchParams: { clubID: string | undefined };
}

const Page = async ({ searchParams }: PageProps) => {
    const clubID = searchParams.clubID;

    if (!clubID) {
        throw new Error('clubID is required in the URL');
    }

    const sessions = await prisma.flight_sessions.findMany({
        where: {
            clubID: clubID,
            sessionDateStart: {
                gte: new Date()
            }
        }
    });

    return (
        <InitialLoading className="h-full w-full">
            <FlightsPageComponent sessionsProp={sessions} />
        </InitialLoading>
    );
};



export default Page;