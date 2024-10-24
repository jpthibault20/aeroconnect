import React from 'react';
import InitialLoading from '@/components/InitialLoading';
import PlanePageComponent from '@/components/flights/PlanePageComponent';

const Page = () => {

    return (
        <InitialLoading className='h-full p-6 bg-gray-100'>
            <PlanePageComponent />
        </InitialLoading>
    );
};

export default Page;
