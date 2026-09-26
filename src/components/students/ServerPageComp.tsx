/**
 * @file ServerPageComp.tsx
 * @brief Container for the StudentsPage, wrapped in InitialLoading.
 */

import InitialLoading from '@/components/InitialLoading';
import StudentsPage from '@/components/students/StudentsPage';
import React from 'react';
import NoClubID from '@/components/NoClubID';
import prisma from '@/api/prisma';
import { getFromCache } from '@/lib/cache';

interface PageProps {
    ClubIDprop: string | string[] | undefined;
}

const ServerPageComp = async ({ ClubIDprop }: PageProps) => {

    if (ClubIDprop) {
        const clubID = Array.isArray(ClubIDprop) ? ClubIDprop[0] : ClubIDprop;

        const fetchUsers = async () => {
            return prisma.user.findMany({
                where: {
                    clubID,
                },
            });
        };
        const users = await getFromCache(`users:${clubID}`, fetchUsers);

        return (
            <InitialLoading className='w-full h-full bg-gray-100' clubIDURL={clubID}>
                <StudentsPage userProps={users} />
            </InitialLoading>
        );
    }
    else {
        return (
            <div className='h-full'>
                <StudentsPage userProps={[]} />
                <NoClubID />
            </div>

        )
    }
}

export default ServerPageComp;
