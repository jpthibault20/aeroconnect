'use server';

import React from 'react';
import FlightsPageComponent from '@/components/flights/FlightsPageComponent';
import InitialLoading from '@/components/InitialLoading';
import NoClubID from '@/components/NoClubID';
import prisma from '@/api/prisma';

interface PageProps {
    ClubIDprop: string | string[] | undefined;
}

const ServerPageComp = async ({ ClubIDprop }: PageProps) => {

    if (ClubIDprop) {
        const clubID = Array.isArray(ClubIDprop) ? ClubIDprop[0] : ClubIDprop;

        // Regrouper les appels à la base de données pour optimiser les performances
        const [sessions, planes, users] = await Promise.all([
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
            prisma.user.findMany({ where: { clubID } }),
        ]);

        return (
            <InitialLoading className="h-full w-full bg-gray-100" clubIDURL={clubID}>
                <FlightsPageComponent sessionsProp={sessions} planesProp={planes} usersProp={users} />
            </InitialLoading>
        );
    }


    return (
        <div>
            <NoClubID />
            <FlightsPageComponent sessionsProp={[]} planesProp={[]} usersProp={[]} />
        </div>
    );

};

export default ServerPageComp;
