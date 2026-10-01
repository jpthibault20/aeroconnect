import React from 'react';
import LogbookPageComponent from './LogbookPageComponent';
import InitialLoading from '@/components/InitialLoading';
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
        const currentYear = new Date().getFullYear();

        let logs: import("@prisma/client").flight_logs[] = [];
        try {
            logs = await prisma.flight_logs.findMany({
                where: {
                    clubID,
                    date: {
                        gte: new Date(`${currentYear}-01-01`),
                        lte: new Date(`${currentYear}-12-31`),
                    },
                },
                orderBy: { date: 'desc' },
            });
        } catch {
            // The flight_logs table may not exist if the migration has not run
        }

        const [allPlanes, users, auth] = await Promise.all([
            prisma.planes.findMany({ where: { clubID } }),
            prisma.user.findMany({ where: { clubID } }),
            getUser(),
        ]);

        // Hide other members' private planes (the manual entry selector and the plane tab
        // must only show club planes + the current member's private plane).
        const currentUser = 'user' in auth ? auth.user : null;
        const planes = currentUser ? filterVisiblePlanes(allPlanes, currentUser) : [];

        return (
            <InitialLoading className="h-full w-full bg-gray-100" clubIDURL={clubID}>
                <LogbookPageComponent logsProp={logs} planesProp={planes} usersProp={users} />
            </InitialLoading>
        );
    }

    return (
        <div>
            <NoClubID />
        </div>
    );
};

export default ServerPageComp;
