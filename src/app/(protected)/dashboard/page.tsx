"use server"
import { getHoursByInstructor, getHoursByMonth } from '@/api/db/sessions';
import PageComponent from '@/components/dashboard/PageComponent';
import { PrismaClient } from '@prisma/client';
import React from 'react'

interface PageProps {
    searchParams: { clubID: string | undefined };
}

const Page = async ({ searchParams }: PageProps) => {
    const clubID = searchParams.clubID;
    const prisma = new PrismaClient();

    if (!clubID) {
        throw new Error('clubID is required in the URL');
    }

    const HoursByMonth = await getHoursByMonth(clubID);
    const HoursByInstructor = await getHoursByInstructor(clubID);

    const planes = await prisma.planes.findMany({
        where: {
            clubID: clubID
        }
    });

    return (
        <PageComponent clubID={clubID} HoursByMonth={HoursByMonth} HoursByInstructor={HoursByInstructor} />
    )
}

export default Page
