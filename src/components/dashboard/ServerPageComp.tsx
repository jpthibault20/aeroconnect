"use server";

import { getAllUserRequestedClubID } from '@/api/db/club';
import { getHoursByInstructor, getHoursByMonth, getHoursByPlane, getHoursByStudent } from '@/api/db/sessions';
import prisma from '@/api/prisma';
import PageComponent from '@/components/dashboard/PageComponent';
import InitialLoading from '@/components/InitialLoading';
import NoClubID from '@/components/NoClubID';
import { getFromCache } from '@/lib/cache'; // Import du cache
import React from 'react';

export interface dashboardProps {
    name: string;
    hours: number;
}

interface PageProps {
    ClubIDprop: string | string[] | undefined;
}

const ServerPageComp = async ({ ClubIDprop }: PageProps) => {

    if (ClubIDprop) {
        const clubID = Array.isArray(ClubIDprop) ? ClubIDprop[0] : ClubIDprop;
        // Récupérer les données via le cache ou la base de données
        const [
            hoursByPlanes,
            HoursByInstructor,
            UsersRequestedClubID,
            HoursByMonth,
            HoursByStudent,
            uers,
        ] = await Promise.all([
            getFromCache(`hoursByPlanes:${clubID}`, () => getHoursByPlane(clubID)),
            getFromCache(`HoursByInstructor:${clubID}`, () => getHoursByInstructor(clubID)),
            getFromCache(`UsersRequestedClubID:${clubID}`, () => getAllUserRequestedClubID(clubID)),
            getFromCache(`HoursByMonth:${clubID}`, () => getHoursByMonth(clubID)),
            getFromCache(`HoursByStudent:${clubID}`, () => getHoursByStudent(clubID)),
            prisma.user.findMany({ where: { clubID: clubID } }),
        ]);

        // Gestion des erreurs pour `UsersRequestedClubID`
        if ('error' in UsersRequestedClubID) {
            console.error(UsersRequestedClubID.error);
            return (
                <div className="h-full">
                    {UsersRequestedClubID.error}
                </div>
            );
        }

        // Rendu du composant avec les données récupérées
        return (
            <InitialLoading clubIDURL={clubID} className="h-full w-full">
                <PageComponent
                    clubID={clubID}
                    HoursByInstructor={HoursByInstructor}
                    UsersRequestedClubID={UsersRequestedClubID}
                    HoursByMonth={HoursByMonth}
                    HoursByStudent={HoursByStudent}
                    hoursByPlanes={hoursByPlanes}
                    users={uers}
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
                    HoursByInstructor={[]}
                    UsersRequestedClubID={[]}
                    HoursByMonth={[]}
                    HoursByStudent={[]}
                    hoursByPlanes={[]}
                    users={[]}
                />
            </div>
        );
    }
};

export default ServerPageComp;
