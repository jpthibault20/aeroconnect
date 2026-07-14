import ServerPage from '@/components/logbook/ServerPageComp';
import LoadingPage from '@/components/LoadingPage';
import { getUser } from '@/api/db/users';
import { redirect } from 'next/navigation';
import React, { Suspense } from 'react';
import { canAccessLogbookPage } from '@/lib/logbookPermissions';

interface PageProps {
    searchParams: Promise<{ [clubID: string]: string | string[] | undefined }>
}

const Page = async ({ searchParams }: PageProps) => {
    const { clubID } = await searchParams;

    const res = await getUser();
    if (res.error || !res.user || !canAccessLogbookPage(res.user.role)) {
        redirect('/calendar');
    }

    return (
        <Suspense fallback={<LoadingPage />}>
            <ServerPage ClubIDprop={clubID} />
        </Suspense>
    )
};

export default Page;
