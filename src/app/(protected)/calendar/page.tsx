'use server';

import React from 'react';
import PageComponent from '@/components/calendar/PageComponent';
import { PrismaClient } from '@prisma/client';

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
        where: { clubID: clubID }
    });

    const planes = await prisma.planes.findMany({
        where: {
            clubID: clubID
        }
    });

    return <PageComponent sessionsprops={sessions} planesProp={planes} />;
};



export default Page;
