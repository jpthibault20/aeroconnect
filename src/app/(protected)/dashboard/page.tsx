"use server"
import { getHoursByInstructor, getHoursByMonth, getHoursByPlane } from '@/api/db/sessions';
import PageComponent from '@/components/dashboard/PageComponent';
import React from 'react'

interface PageProps {
    searchParams: { clubID: string | undefined };
}

const Page = async ({ searchParams }: PageProps) => {
    const clubID = searchParams.clubID;

    if (!clubID) {
        throw new Error('clubID is required in the URL');
    }

    const HoursByMonth = await getHoursByMonth(clubID);
    const HoursByInstructor = await getHoursByInstructor(clubID);
    const HoursByPlane = await getHoursByPlane(clubID);

    return (
        <PageComponent clubID={clubID} HoursByMonth={HoursByMonth} HoursByInstructor={HoursByInstructor} HoursByPlane={HoursByPlane} />
    )
}

export default Page
