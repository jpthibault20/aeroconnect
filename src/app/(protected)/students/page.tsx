'use server';

import LoadingPage from '@/components/LoadingPage';
import ServerPage from '@/components/students/ServerPage';
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
