"use server";
/**
 * @file Page.tsx
 * @brief A React component that serves as the main page for displaying planes.
 * 
 * This component wraps the `PlanesPage` component with an initial loading state
 * to enhance user experience by indicating loading status.
 * 
 * @returns The rendered page component containing the planes page.
 */

import React from 'react';
import InitialLoading from '@/components/InitialLoading';
import PlanesPage from '@/components/plane/PlanesPage';
import { PrismaClient } from '@prisma/client';
import NoClubID from '@/components/NoClubID';

const prisma = new PrismaClient();

interface PageProps {
    searchParams: { clubID: string | undefined };
}

const Page = async ({ searchParams }: PageProps) => {
    const clubID = searchParams.clubID;

    if (clubID) {
        const planes = await prisma.planes.findMany({
            where: {
                clubID: clubID
            }
        });

        return (
            <InitialLoading className='bg-gray-100 h-full'>
                <PlanesPage PlanesProps={planes} />
            </InitialLoading>
        );
    }
    else {
        return (
            <NoClubID />
        )
    }
}

export default Page;
