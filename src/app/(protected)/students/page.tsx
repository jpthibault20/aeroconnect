import InitialLoading from '@/components/InitialLoading'
import StudentsPage from '@/components/students/StudentsPage'
import React from 'react'

const Page = () => {
    return (
        <InitialLoading>
            <StudentsPage />
        </InitialLoading>
    )
}

export default Page
