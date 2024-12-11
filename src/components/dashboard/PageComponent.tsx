"use client"

import React from 'react'
import Header from './Header';
import MembershipRequests from './MembershipRequests';
import MonthlyHoursChart from './MonthlyHoursChart';
import InstructorHoursChart from './InstructorHoursChart';
import AircraftHoursChart from './AircraftHoursChart';
import StudentHoursChart from './StudentHoursChart';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { indexLinkDashboard, navigationLinks } from '@/config/links';
import { useRouter } from 'next/navigation';
import InitialLoading from '../InitialLoading';
import { dashboardProps } from '@/app/(protected)/dashboard/page';
import { User } from '@prisma/client';

interface PageProps {
    clubID: string;
    HoursByInstructor: dashboardProps[],
    hoursByPlanes: dashboardProps[],
    HoursByStudent: dashboardProps[],
    HoursByMonth: dashboardProps[],
    UsersRequestedClubID: User[],
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PageComponent = ({ clubID, HoursByInstructor, hoursByPlanes, HoursByStudent, HoursByMonth, UsersRequestedClubID }: PageProps) => {
    const { currentUser } = useCurrentUser();
    const router = useRouter();

    if (!currentUser || currentUser.role! in navigationLinks[indexLinkDashboard].roles) {
        router.push('/calendar?clubID=' + clubID);
    }
    return (
        <InitialLoading className="min-h-screen bg-gray-200 max-h-screen overflow-y-auto" clubIDURL={clubID}>
            <Header clubName="Aeroculb ULM du saulnois" />
            <main className="container mx-auto px-4 py-7">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="col-span-1 md:col-span-2 lg:col-span-3">
                        <MembershipRequests UsersRequestedClubID={UsersRequestedClubID} />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <MonthlyHoursChart HoursByMonth={HoursByMonth} />
                    </div>
                    <div className="col-span-1 md:col-span-1 lg:col-span-1">
                        <InstructorHoursChart HoursByInstructor={HoursByInstructor} />
                    </div>
                    <div className="col-span-1 md:col-span-1 lg:col-span-1">
                        <AircraftHoursChart hoursByPlanes={hoursByPlanes} />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <StudentHoursChart HoursByStudent={HoursByStudent} />
                    </div>
                </div>
            </main>
        </InitialLoading>
    )
}

export default PageComponent
