import { getAllUserRequestedClubID } from '@/api/db/club';
import { getPendingBaptemeRequests, getPublicBookingToken } from '@/api/db/bapteme';
import { getUser } from '@/api/db/users';
import prisma from '@/api/prisma';
import PageComponent from '@/components/dashboard/PageComponent';
import InitialLoading from '@/components/InitialLoading';
import NoClubID from '@/components/NoClubID';
import { canEditClubSettings, canManageClub } from '@/lib/clubAccess';
import { User } from '@prisma/client';
import React from 'react';

interface PageProps {
    ClubIDprop: string | string[] | undefined;
}

const ServerPageComp = async ({ ClubIDprop }: PageProps) => {

    if (ClubIDprop) {
        const clubID = Array.isArray(ClubIDprop) ? ClubIDprop[0] : ClubIDprop;

        // La page « Club » est ouverte à tous les membres, mais les données
        // sensibles ne sont même pas chargées pour les autres rôles : on résout
        // d'abord l'utilisateur pour ne demander que ce qu'il a le droit de voir.
        // Les statistiques (AER-68) sont chargées par les onglets eux-mêmes, selon
        // la période choisie (cf. src/api/db/stats.ts).
        const userRes = await getUser();
        const currentUser = 'user' in userRes ? userRes.user : null;
        const isMember = currentUser?.clubID === clubID;
        const isManagement = isMember && canManageClub(currentUser?.role);
        const canEditSettings = isMember && canEditClubSettings(currentUser?.role);

        // Données de la page, filtrées selon le rôle
        const [
            UsersRequestedClubID,
            uers,
            pendingBaptemesRes,
            publicTokenRes,
        ] = await Promise.all([
            isManagement ? getAllUserRequestedClubID(clubID) : ([] as User[]),
            canEditSettings ? prisma.user.findMany({ where: { clubID: clubID } }) : ([] as User[]),
            getPendingBaptemeRequests(clubID),
            getPublicBookingToken(clubID),
        ]);

        // Gestion des erreurs pour `UsersRequestedClubID`
        if ('error' in UsersRequestedClubID) {
            return (
                <div className="h-full">
                    {UsersRequestedClubID.error}
                </div>
            );
        }

        // Baptêmes en attente / jeton public : non bloquants (dépendent du rôle),
        // on retombe sur des valeurs par défaut en cas d'erreur ou de permission.
        const pendingBaptemes = Array.isArray(pendingBaptemesRes) ? pendingBaptemesRes : [];
        const publicBookingToken: string | null =
            (publicTokenRes && 'token' in publicTokenRes ? publicTokenRes.token : null) ?? null;

        // Rendu du composant avec les données récupérées
        return (
            <InitialLoading clubIDURL={clubID} className="h-full w-full">
                <PageComponent
                    clubID={clubID}
                    UsersRequestedClubID={UsersRequestedClubID}
                    users={uers}
                    pendingBaptemes={pendingBaptemes}
                    publicBookingToken={publicBookingToken}
                />
            </InitialLoading>
        );
    } else {
        // Si aucun clubID n'est fourni
        return (
            <div className="h-full">
                <NoClubID />
                <PageComponent
                    clubID={""}
                    UsersRequestedClubID={[]}
                    users={[]}
                    pendingBaptemes={[]}
                    publicBookingToken={null}
                />
            </div>
        );
    }
};

export default ServerPageComp;
