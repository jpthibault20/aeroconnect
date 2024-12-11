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

interface PageProps {
    clubID: string;

}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PageComponent = ({ clubID }: PageProps) => {
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
                        <MembershipRequests />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <MonthlyHoursChart clubID={clubID} />
                    </div>
                    <div className="col-span-1 md:col-span-1 lg:col-span-1">
                        <InstructorHoursChart clubID={clubID} />
                    </div>
                    <div className="col-span-1 md:col-span-1 lg:col-span-1">
                        <AircraftHoursChart clubID={clubID} />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <StudentHoursChart clubID={clubID} />
                    </div>
                </div>
            </main>
        </InitialLoading>
    )
}

export default PageComponent
