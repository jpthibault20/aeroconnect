import React from 'react'
import InitialLoading from '@/components/InitialLoading'
import PlanesPage from '@/components/plane/PlanesPage'

const Page = () => {
    return (
        <InitialLoading>
            <PlanesPage />
        </InitialLoading>

    )
}

export default Page
