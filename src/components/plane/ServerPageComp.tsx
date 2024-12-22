"use server";

import React from 'react';
import InitialLoading from '@/components/InitialLoading';
import PlanesPage from '@/components/plane/PlanesPage';
import NoClubID from '@/components/NoClubID';
import prisma from '@/api/prisma';
import { getFromCache } from '@/lib/cache';

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

        // Récupération des avions depuis le cache ou la base de données
        const planes = await getFromCache(`planes:${clubID}`, fetchPlanes);

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
