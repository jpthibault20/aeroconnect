"use client"

import React, { useState } from 'react'
import Header from './Header';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { indexLinkDashboard, navigationLinks } from '@/config/links';
import { useRouter } from 'next/navigation';
import InitialLoading from '../InitialLoading';
import { User } from '@prisma/client';
import { dashboardProps } from './ServerPageComp';
import SettingsPage from './SettingsPage';
import DashboardPage from './DashboardPage';
import { PendingBaptemeItem } from './PendingBaptemeRequests';
import { canEditClubSettings } from '@/lib/clubAccess';

interface PageProps {
    clubID: string;
    HoursByInstructor: dashboardProps[],
    hoursByPlanes: dashboardProps[],
    HoursByStudent: dashboardProps[],
    HoursByMonth: dashboardProps[],
    UsersRequestedClubID: User[],
    users: User[],
    pendingBaptemes: PendingBaptemeItem[],
    publicBookingToken: string | null,
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PageComponent = ({ clubID, HoursByInstructor, hoursByPlanes, HoursByStudent, HoursByMonth, UsersRequestedClubID, users, pendingBaptemes, publicBookingToken }: PageProps) => {
    const [display, setDisplay] = useState<"dashboard" | "settings">("dashboard");
    const { currentUser } = useCurrentUser();
    const router = useRouter();

    if (!currentUser || !navigationLinks[indexLinkDashboard].roles.includes(currentUser.role)) {
        router.push('/calendar?clubID=' + clubID);
    }

    // Garde-fou : l'onglet « Paramètres » n'est proposé qu'au président / admin,
    // on revalide ici pour ne jamais rendre le formulaire à un autre rôle.
    const showSettings = display === "settings" && canEditClubSettings(currentUser?.role);

    return (
        <InitialLoading className="min-h-screen max-h-screen overflow-y-auto bg-gray-100 " clubIDURL={clubID}>
            <Header display={display} setDisplay={setDisplay} />
            <main className="container mx-auto px-4 py-7">{
                showSettings ? (
                    <SettingsPage users={users} />
                ) : (

                    <DashboardPage
                        clubID={clubID}
                        HoursByInstructor={HoursByInstructor}
                        hoursByPlanes={hoursByPlanes}
                        HoursByStudent={HoursByStudent}
                        HoursByMonth={HoursByMonth}
                        UsersRequestedClubID={UsersRequestedClubID}
                        pendingBaptemes={pendingBaptemes}
                        publicBookingToken={publicBookingToken}
                    />
                )
            }</main>
        </InitialLoading>
    )
}

export default PageComponent
