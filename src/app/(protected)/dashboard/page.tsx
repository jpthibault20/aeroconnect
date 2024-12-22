'use server';

import ServerPage from '@/components/dashboard/ServerPageComp';
import LoadingPage from '@/components/LoadingPage';
import React, { Suspense } from 'react';

interface PageProps {
    searchParams: Promise<{ [clubID: string]: string | string[] | undefined }>
}

const Page = async ({ searchParams }: PageProps) => {
    const { clubID } = await searchParams;

    return (
        <Suspense fallback={<LoadingPage />}>
            <ServerPage ClubIDprop={clubID} />
            </Suspense>
    )
};

export default Page;
