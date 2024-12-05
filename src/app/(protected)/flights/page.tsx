'use server';

import React from 'react';
import { PrismaClient } from '@prisma/client';
import FlightsPageComponent from '@/components/flights/FlightsPageComponent';
import InitialLoading from '@/components/InitialLoading';
import NoClubID from '@/components/NoClubID';

const prisma = new PrismaClient();

interface PageProps {
    searchParams: { clubID: string | undefined };
}

const Page = async ({ searchParams }: PageProps) => {
    const clubID = searchParams.clubID;

    if (clubID) {
        const sessions = await prisma.flight_sessions.findMany({
            where: {
                clubID: clubID,
                sessionDateStart: {
                    gte: new Date()
                }
            }
        });

        const planes = await prisma.planes.findMany({
            where: {
                clubID: clubID
            }
        });
        return (
            <InitialLoading className="h-full w-full bg-gray-100">
                <FlightsPageComponent sessionsProp={sessions} planesProp={planes} />
            </InitialLoading>
        );
    }
    else {
        return (
            <NoClubID />
        )
    }
};



export default Page;