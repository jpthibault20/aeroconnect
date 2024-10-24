/**
 * @file Page.tsx
 * @brief A React component that serves as the main page for displaying planes.
 * 
 * This component wraps the `PlanesPage` component with an initial loading state
 * to enhance user experience by indicating loading status.
 * 
 * @returns The rendered page component containing the planes page.
 */

import React from 'react';
import InitialLoading from '@/components/InitialLoading';
import PlanesPage from '@/components/plane/PlanesPage';

const Page = () => {
    return (
        <InitialLoading className='bg-gray-100 h-full'>
            <PlanesPage />
        </InitialLoading>
    );
}

export default Page;
