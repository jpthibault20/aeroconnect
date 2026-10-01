import React from 'react';
import InitialLoading from '@/components/InitialLoading';
import PlanesPage from '@/components/plane/PlanesPage';
import NoClubID from '@/components/NoClubID';
import prisma from '@/api/prisma';
import { getFromCache } from '@/lib/cache';
import { getUser } from '@/api/db/users';
import { filterVisiblePlanes } from '@/lib/planeVisibility';
import { planes, userRole } from '@prisma/client';

interface PageProps {
    ClubIDprop: string | string[] | undefined;
}

const ServerPageComp = async ({ ClubIDprop }: PageProps) => {

    if (ClubIDprop) {
        const clubID = Array.isArray(ClubIDprop) ? ClubIDprop[0] : ClubIDprop;

        const fetchPlanes = async () => {
            return prisma.planes.findMany({
                where: { clubID },
            });
        };

        // Planes from the cache or the DB. The cache holds ALL the club's planes; they
        // are then filtered by visibility for the current user (other members' private
        // planes must not show).
        const allPlanes: planes[] = await getFromCache(`planes:${clubID}`, fetchPlanes);
        const auth = await getUser();
        const currentUser = 'user' in auth ? auth.user : null;
        const planes = currentUser
            ? filterVisiblePlanes(allPlanes, currentUser)
            : [];

        // President (OWNER) and admin see every club plane, including other members'
        // private planes: the owner's name is resolved to show it in the list. For other
        // roles the column is not rendered, so the query is skipped.
        const canViewOwner =
            currentUser?.role === userRole.OWNER || currentUser?.role === userRole.ADMIN;
        let ownerNames: Record<string, string> = {};
        if (canViewOwner) {
            const ownerIDs = [
                ...new Set(
                    planes
                        .map((p) => p.ownerID)
                        .filter((id): id is string => !!id)
                ),
            ];
            if (ownerIDs.length > 0) {
                const owners = await prisma.user.findMany({
                    where: { id: { in: ownerIDs } },
                    select: { id: true, firstName: true, lastName: true },
                });
                ownerNames = Object.fromEntries(
                    owners.map((o) => [o.id, `${o.firstName} ${o.lastName}`.trim()])
                );
            }
        }

        return (
            <InitialLoading className='bg-gray-100 h-full' clubIDURL={clubID}>
                <PlanesPage PlanesProps={planes} ownerNames={ownerNames} />
            </InitialLoading>
        );
    } else {
        return (
            <div>
                <NoClubID />
                <PlanesPage PlanesProps={[]} />
            </div>
        );
    }
};

export default ServerPageComp;
