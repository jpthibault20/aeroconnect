import React from 'react';
import PageComponent from '@/components/calendar/PageComponent';
import NoClubID from '@/components/NoClubID';
import prisma from '@/api/prisma';
import { getUser } from '@/api/db/users';
import { filterVisiblePlanes } from '@/lib/planeVisibility';

interface PageProps {
    ClubIDprop: string | string[] | undefined;
}

const ServerPageComp = async ({ ClubIDprop }: PageProps) => {
    if (ClubIDprop) {
        const clubID = Array.isArray(ClubIDprop) ? ClubIDprop[0] : ClubIDprop;
        const [sessions, allPlanes, users, auth] = await Promise.all([
            prisma.flight_sessions.findMany({ where: { clubID: clubID } }),
            prisma.planes.findMany({ where: { clubID: clubID } }),
            prisma.user.findMany({ where: { clubID: clubID } }),
            getUser()
        ]);

        // Hide other members' private planes: each member sees the club planes + only
        // their own private plane (president/admin see every private plane).
        const currentUser = 'user' in auth ? auth.user : null;
        const planes = currentUser ? filterVisiblePlanes(allPlanes, currentUser) : [];

        if (sessions) {
            return (
                <div className='h-full'>
                    <PageComponent
                        sessionsprops={sessions}
                        planesProp={planes}
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
                clubIDUrl={""}
                usersProps={[]}
            />
        </div>
    );
};

export default ServerPageComp;
