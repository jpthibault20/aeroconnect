"use server"
import { getAllUserRequestedClubID } from '@/api/db/club';
import { getHoursByInstructor, getHoursByMonth, getHoursByPlane, getHoursByStudent } from '@/api/db/sessions';
import PageComponent from '@/components/dashboard/PageComponent';
import InitialLoading from '@/components/InitialLoading';
import NoClubID from '@/components/NoClubID';
import { Skeleton } from '@/components/ui/skeleton';
import React, { Suspense } from 'react'

export interface dashboardProps {
    name: string;
    hours: number;
}
interface PageProps {
    searchParams: { clubID: string | undefined };
}

const Page = async ({ searchParams }: PageProps) => {
    const clubID = searchParams.clubID;

    if (clubID) {

        const [hoursByPlanes, HoursByInstructor, UsersRequestedClubID, HoursByMonth, HoursByStudent] = await Promise.all([
            await getHoursByPlane(clubID),
            await getHoursByInstructor(clubID),
            await getAllUserRequestedClubID(clubID),
            await getHoursByMonth(clubID),
            await getHoursByStudent(clubID),
        ]);

        if ('error' in UsersRequestedClubID) {
            console.error(UsersRequestedClubID.error);
            return (
                <div className="h-full">
                    {UsersRequestedClubID.error}
                </div>
            );
        }

        return (
            <Suspense fallback={<Skeleton className="w-[100px] h-[20px] rounded-full" />}>
                <InitialLoading clubIDURL={clubID} className="h-full w-full">
                    <PageComponent
                        clubID={clubID}
                        HoursByInstructor={HoursByInstructor}
                        UsersRequestedClubID={UsersRequestedClubID}
                        HoursByMonth={HoursByMonth}
                        HoursByStudent={HoursByStudent}
                        hoursByPlanes={hoursByPlanes} />
                </InitialLoading>
            </Suspense>
        )
    }
    else {
        return (
            <div className='h-full'>
                <NoClubID />
                <PageComponent
                    clubID={""}
                    HoursByInstructor={[]}
                    UsersRequestedClubID={[]}
                    HoursByMonth={[]}
                    HoursByStudent={[]}
                    hoursByPlanes={[]} />
            </div>
        )
    }
}

export default Page
