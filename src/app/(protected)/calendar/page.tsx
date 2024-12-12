'use server';

import React, { Suspense } from 'react';
import PageComponent from '@/components/calendar/PageComponent';
import NoClubID from '@/components/NoClubID';
import { workingHour } from '@/config/configClub';
import prisma from '@/api/prisma';
import { Skeleton } from '@/components/ui/skeleton';

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
        if (club?.HoursOn && sessions) {
            return (
                <Suspense fallback={<Skeleton className="w-[100px] h-[20px] rounded-full" />}>
                    <div className='h-full'>
                        <PageComponent
                            sessionsprops={sessions}
                            planesProp={planes}
                            clubHours={club.HoursOn}
                            clubID={clubID}
                        />
                    </div>
                </Suspense>
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
