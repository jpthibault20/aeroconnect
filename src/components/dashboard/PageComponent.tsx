"use client"

import React, { useState } from 'react'
import Header from './Header';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { indexLinkDashboard, navigationLinks } from '@/config/links';
import { useRouter } from 'next/navigation';
import InitialLoading from '../InitialLoading';
import { Club, User } from '@prisma/client';
import { dashboardProps } from './ServerPageComp';
import SettingsPage from './SettingsPage';
import DashboardPage from './DashboardPage';

interface PageProps {
    clubID: string;
    HoursByInstructor: dashboardProps[],
    hoursByPlanes: dashboardProps[],
    HoursByStudent: dashboardProps[],
    HoursByMonth: dashboardProps[],
    UsersRequestedClubID: User[],
    club: Club,
    users: User[],
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PageComponent = ({ clubID, HoursByInstructor, hoursByPlanes, HoursByStudent, HoursByMonth, UsersRequestedClubID, club, users }: PageProps) => {
    const [display, setDisplay] = useState<"dashboard" | "settings">("dashboard");
    const { currentUser } = useCurrentUser();
    const router = useRouter();

    if (!currentUser || currentUser.role! in navigationLinks[indexLinkDashboard].roles) {
        router.push('/calendar?clubID=' + clubID);
    }
    return (
        <InitialLoading className="min-h-screen max-h-screen overflow-y-auto bg-gray-100 " clubIDURL={clubID}>
            <Header clubName={club.Name} display={display} setDisplay={setDisplay} />
            <main className="container mx-auto px-4 py-7">{
                display === "dashboard" ? (

                    <DashboardPage
                        HoursByInstructor={HoursByInstructor}
                        hoursByPlanes={hoursByPlanes}
                        HoursByStudent={HoursByStudent}
                        HoursByMonth={HoursByMonth}
                        UsersRequestedClubID={UsersRequestedClubID}
                    />

                )
                    : display === "settings" ? (
                        <SettingsPage club={club} users={users} />
                    ) : null
            }</main>
        </InitialLoading>
    )
}

export default PageComponent
