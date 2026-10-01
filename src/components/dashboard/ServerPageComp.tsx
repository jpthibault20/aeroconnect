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

        // The "Club" page is open to every member, but sensitive data is not even loaded
        // for other roles: the user is resolved first so only what they may see is
        // requested. Statistics (AER-68) are loaded by the tabs themselves, for the
        // chosen period (see src/api/db/stats.ts).
        const userRes = await getUser();
        const currentUser = 'user' in userRes ? userRes.user : null;
        const isMember = currentUser?.clubID === clubID;
        const isManagement = isMember && canManageClub(currentUser?.role);
        const canEditSettings = isMember && canEditClubSettings(currentUser?.role);

        // Page data, filtered by role
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

        if ('error' in UsersRequestedClubID) {
            return (
                <div className="h-full">
                    {UsersRequestedClubID.error}
                </div>
            );
        }

        // Pending discovery flights / public token: non-blocking (role dependent), fall
        // back to defaults on error or missing permission.
        const pendingBaptemes = Array.isArray(pendingBaptemesRes) ? pendingBaptemesRes : [];
        const publicBookingToken: string | null =
            (publicTokenRes && 'token' in publicTokenRes ? publicTokenRes.token : null) ?? null;

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
        // No clubID provided
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
