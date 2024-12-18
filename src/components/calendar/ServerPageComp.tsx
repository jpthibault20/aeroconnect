'use server';

import React from 'react';
import PageComponent from '@/components/calendar/PageComponent';
import NoClubID from '@/components/NoClubID';
import prisma from '@/api/prisma';

interface PageProps {
    searchParams: { clubID: string | undefined };
}

const ServerPageComp = async ({ searchParams }: PageProps) => {
    'use cache'
    const { clubID } = searchParams;

    if (clubID) {
        // Exécution parallèle des requêtes Prisma
        const [sessions, planes, club, users] = await Promise.all([
            prisma.flight_sessions.findMany({ where: { clubID } }),
            prisma.planes.findMany({ where: { clubID } }),
            prisma.club.findUnique({ where: { id: clubID } }),
            prisma.user.findMany({ where: { clubID } })
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
