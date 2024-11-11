import InitialLoading from '@/components/InitialLoading'
import ProfilePage from '@/components/profile/ProfilePage'
import React from 'react'

const Page = () => {
    return (
        <InitialLoading className='h-full w-full'>
            <ProfilePage />
        </InitialLoading>
    )
}

export default Page
