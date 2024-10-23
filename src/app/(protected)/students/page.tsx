import InitialLoading from '@/components/InitialLoading'
import StudentsPage from '@/components/students/StudentsPage'
import React from 'react'

const Page = () => {
    return (
        <InitialLoading className='w-full h-full bg-gray-100'>
            <StudentsPage />
        </InitialLoading>
    )
}

export default Page
