/**
 * @file Page.tsx
 * @brief A React component that serves as a container for the StudentsPage.
 * 
 * This component wraps the StudentsPage component with an InitialLoading 
 * component, which handles the loading state while the student data is being fetched.
 * 
 * @returns The rendered page component containing the StudentsPage.
 */

import InitialLoading from '@/components/InitialLoading';
import StudentsPage from '@/components/students/StudentsPage';
import React from 'react';

const Page = () => {
    return (
        <InitialLoading className='w-full h-full bg-gray-100'>
            <StudentsPage />
        </InitialLoading>
    );
}

export default Page;
