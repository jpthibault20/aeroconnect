'use server';

import React from 'react';
import PageComponent from '@/components/calendar/PageComponent';
import NoClubID from '@/components/NoClubID';
import { workingHour } from '@/config/configClub';
import prisma from '@/api/prisma';

interface PageProps {
    searchParams: { clubID: string | undefined };
}

const Page = async ({ searchParams }: PageProps) => {
    const { clubID } = searchParams;

    if (clubID) {
        // Exécution parallèle des requêtes Prisma
        const [sessions, planes, club] = await Promise.all([
            prisma.flight_sessions.findMany({ where: { clubID } }),
            prisma.planes.findMany({ where: { clubID } }),
            prisma.club.findUnique({ where: { id: clubID } })
        ]);

        // Vérification si les données du club sont valides
        if (club?.HoursOn && sessions.length > 0) {
            return (
                <div className='h-full'>
                    <PageComponent
                        sessionsprops={sessions}
                        planesProp={planes}
                        clubHours={club.HoursOn}
                        clubID={clubID}
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
                clubHours={workingHour}
                clubID=''
            />
        </div>
    );
};

export default Page;
