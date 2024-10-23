import React from 'react'
import InitialLoading from '@/components/InitialLoading'
import PlanesPage from '@/components/plane/PlanesPage'

const Page = () => {
    return (
        <InitialLoading className='bg-gray-100 h-full'>
            <PlanesPage />
        </InitialLoading>

    )
}

export default Page
