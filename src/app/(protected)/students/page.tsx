'use server';

import LoadingPage from '@/components/LoadingPage';
import ServerPage from '@/components/students/ServerPageComp';
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
