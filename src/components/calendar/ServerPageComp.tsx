'use server';

import React from 'react';
import PageComponent from '@/components/calendar/PageComponent';
import NoClubID from '@/components/NoClubID';
import prisma from '@/api/prisma';

interface PageProps {
    ClubIDprop: string | string[] | undefined;
}

const ServerPageComp = async ({ ClubIDprop }: PageProps) => {

    if (ClubIDprop) {

        const clubID = Array.isArray(ClubIDprop) ? ClubIDprop[0] : ClubIDprop;
        // Exécution parallèle des requêtes Prisma
        const [sessions, planes, club, users] = await Promise.all([
            prisma.flight_sessions.findMany({ where: { clubID:clubID } }),
            prisma.planes.findMany({ where: { clubID: clubID } }),
            prisma.club.findUnique({ where: { id: clubID } }),
            prisma.user.findMany({ where: { clubID: clubID } })
        ]);

        // Vérification si les données du club sont valides
        if (club?.HoursOn && sessions) {
            return (
                <div className='h-full'>
                    <PageComponent
                        sessionsprops={sessions}
                        planesProp={planes}
                        club={club}
                        clubIDUrl={clubID}
                        usersProps={users}
                    />
                </div>
            );
        }
    }

    return (
        <div className='h-full'>
            <NoClubID />
            <PageComponent
                sessionsprops={[]}
                planesProp={[]}
                club={null}
                clubIDUrl={""}
                usersProps={[]}
            />
        </div>
    );
};

export default ServerPageComp;
