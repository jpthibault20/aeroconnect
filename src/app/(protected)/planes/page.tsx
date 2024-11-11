"use client";
/**
 * @file Page.tsx
 * @brief A React component that serves as the main page for displaying planes.
 * 
 * This component wraps the `PlanesPage` component with an initial loading state
 * to enhance user experience by indicating loading status.
 * 
 * @returns The rendered page component containing the planes page.
 */

import React, { useEffect, useState } from 'react';
import InitialLoading from '@/components/InitialLoading';
import PlanesPage from '@/components/plane/PlanesPage';
import { navigationLinks, indexLinkPlane } from '@/config/links';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/SpinnerVariants';

const Page = () => {
    const [loading, setLoading] = useState(true);
    const { currentUser } = useCurrentUser();
    const router = useRouter();

    useEffect(() => {
        // Si currentUser est undefined, rester en état de chargement
        if (currentUser === undefined) return;

        // Vérifier si l'utilisateur a le bon rôle
        if (!navigationLinks[indexLinkPlane].roles.includes(currentUser.role)) {
            router.replace("/calendar");
        } else {
            // Une fois que le rôle est validé, désactiver l'état de chargement
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    return (
        <InitialLoading className='bg-gray-100 h-full'>
            {loading ? (
                <div className='flex h-full w-full justify-center items-center'>
                    <Spinner />
                    <p>Chargement...</p>
                </div>
            ) : (
                <PlanesPage />
            )}
        </InitialLoading>
    );
}

export default Page;
