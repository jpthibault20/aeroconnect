"use server"
/**
 * @file Page.tsx
 * @brief A React component that serves as a container for the StudentsPage.
 * 
 * This component wraps the StudentsPage component with an InitialLoading 
 * component, which handles the loading state while the student data is being fetched.
 * 
 * @returns The rendered page component containing the StudentsPage.
 */

import InitialLoading from '@/components/InitialLoading';
import StudentsPage from '@/components/students/StudentsPage';
import React from 'react';
import NoClubID from '@/components/NoClubID';
import prisma from '@/api/prisma';
import { getFromCache } from '@/lib/cache';
import { userRole } from '@prisma/client';

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
                    role: userRole.USER || userRole.STUDENT || userRole.PILOT
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
