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

        // Président (OWNER) et admin voient toutes les machines du club, y compris
        // les machines privées des autres membres : on résout le nom du
        // propriétaire pour l'afficher dans la liste. Pour les autres rôles, la
        // colonne n'est pas rendue : inutile de faire la requête.
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
