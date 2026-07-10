import React from 'react';
import InitialLoading from '@/components/InitialLoading';
import PlanesPage from '@/components/plane/PlanesPage';
import NoClubID from '@/components/NoClubID';
import prisma from '@/api/prisma';
import { getFromCache } from '@/lib/cache';
import { getUser } from '@/api/db/users';
import { filterVisiblePlanes } from '@/lib/planeVisibility';
import { planes } from '@prisma/client';

interface PageProps {
    ClubIDprop: string | string[] | undefined;
}

const ServerPageComp = async ({ ClubIDprop }: PageProps) => {

    if (ClubIDprop) {
        const clubID = Array.isArray(ClubIDprop) ? ClubIDprop[0] : ClubIDprop;

        // Fonction pour récupérer les avions depuis Prisma
        const fetchPlanes = async () => {
            return prisma.planes.findMany({
                where: { clubID },
            });
        };

        // Récupération des avions depuis le cache ou la base de données. Le cache
        // contient TOUTES les machines du club ; on filtre ensuite par visibilité
        // selon l'utilisateur courant (les machines privées des autres membres
        // ne doivent pas apparaître).
        const allPlanes: planes[] = await getFromCache(`planes:${clubID}`, fetchPlanes);
        const auth = await getUser();
        const currentUser = 'user' in auth ? auth.user : null;
        const planes = currentUser
            ? filterVisiblePlanes(allPlanes, currentUser)
            : [];

        return (
            <InitialLoading className='bg-gray-100 h-full' clubIDURL={clubID}>
                <PlanesPage PlanesProps={planes} />
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
