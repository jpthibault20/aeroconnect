/**
 * @file Page.tsx
 * @brief Main page component for the Plane page.
 * 
 * @details
 * This component serves as the main entry point for the Plane page, 
 * rendering the InitialLoading component and the PlanePageComponent.
 */

import React from 'react';
import InitialLoading from '@/components/InitialLoading';
import FlightsPageComponent from '@/components/flights/FlightsPageComponent';

/**
 * @component Page
 * @description Main component for the Plane page.
 * 
 */
const Page = () => {
    return (
        <InitialLoading className='h-full p-6 bg-gray-100'>
            <FlightsPageComponent />
        </InitialLoading>
    );
};

export default Page;
