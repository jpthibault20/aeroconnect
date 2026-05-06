import ServerPage from '@/components/logbook/ServerPageComp';
import LoadingPage from '@/components/LoadingPage';
import { getUser } from '@/api/db/users';
import { redirect } from 'next/navigation';
import { userRole } from '@prisma/client';
import React, { Suspense } from 'react';

interface PageProps {
    searchParams: Promise<{ [clubID: string]: string | string[] | undefined }>
}

const ALLOWED_ROLES: userRole[] = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER, userRole.INSTRUCTOR, userRole.STUDENT];

const Page = async ({ searchParams }: PageProps) => {
    const { clubID } = await searchParams;

    const res = await getUser();
    if (res.error || !res.user || !ALLOWED_ROLES.includes(res.user.role)) {
        redirect('/calendar');
    }

    return (
        <Suspense fallback={<LoadingPage />}>
            <ServerPage ClubIDprop={clubID} />
        </Suspense>
    )
};

export default Page;
