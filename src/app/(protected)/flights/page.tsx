'use server';

import React from 'react';
import FlightsPageComponent from '@/components/flights/FlightsPageComponent';
import InitialLoading from '@/components/InitialLoading';
import NoClubID from '@/components/NoClubID';
import prisma from '@/api/prisma';

interface PageProps {
    searchParams: { clubID: string | undefined };
}

const Page = async ({ searchParams }: PageProps) => {
    const clubID = searchParams.clubID;

    if (!clubID) {
        return (
            <div>
                <NoClubID />
                <FlightsPageComponent sessionsProp={[]} planesProp={[]} usersProp={[]} clubProp={null} />
            </div>
        );
    }

    // Regrouper les appels à la base de données pour optimiser les performances
    const [sessions, planes, club, users] = await Promise.all([
        prisma.flight_sessions.findMany({
            where: {
                clubID,
                sessionDateStart: {
                    gte: new Date(),
                },
            },
        }),
        prisma.planes.findMany({
            where: { clubID },
        }),
        prisma.club.findUnique({ where: { id: clubID } }),
        prisma.user.findMany({ where: { clubID } }),
    ]);

    return (
        <InitialLoading className="h-full w-full bg-gray-100" clubIDURL={clubID}>
            <FlightsPageComponent sessionsProp={sessions} planesProp={planes} usersProp={users} clubProp={club} />
        </InitialLoading>
    );
};

export default Page;
