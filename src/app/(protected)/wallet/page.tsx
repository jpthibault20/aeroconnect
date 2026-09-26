import LoadingPage from '@/components/LoadingPage';
import InitialLoading from '@/components/InitialLoading';
import NoClubID from '@/components/NoClubID';
import WalletPageComponent from '@/components/wallet/WalletPageComponent';
import React, { Suspense } from 'react';

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// Portefeuille élève (AER-66). Aucune donnée chargée ici : tout passe par les
// server actions de src/api/db/wallet.ts, qui appliquent rôle + clubID.
const Page = async ({ searchParams }: PageProps) => {
    const { clubID, userID, action } = await searchParams;
    const club = Array.isArray(clubID) ? clubID[0] : clubID;
    const member = Array.isArray(userID) ? userID[0] : userID;

    if (!club) {
        return (
            <div className='h-full'>
                <NoClubID />
            </div>
        );
    }

    return (
        <Suspense fallback={<LoadingPage />}>
            <InitialLoading className='w-full h-full' clubIDURL={club}>
                <WalletPageComponent userID={member ?? null} openCredit={action === 'credit'} />
            </InitialLoading>
        </Suspense>
    );
};

export default Page;
