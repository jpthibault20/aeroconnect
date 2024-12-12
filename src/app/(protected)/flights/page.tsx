'use server';

import ServerPage from '@/components/flights/ServerPageComp';
import LoadingPage from '@/components/LoadingPage';
import React, { Suspense } from 'react';

interface PageProps {
    searchParams: { clubID: string | undefined };
}

const Page = async ({ searchParams }: PageProps) => {
    return (
        <Suspense fallback={<LoadingPage />}>
            <ServerPage searchParams={searchParams} />
        </Suspense>
    )
};

export default Page;
