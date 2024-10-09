"use client"
import React from 'react'
import InitialLoading from '@/components/InitialLoading';


const Page = () => {

    return (
        <div className='h-full'>
            <InitialLoading>
                <div className='flex flex-col justify-center items-center'>
                    <p className='text-2xl font-istok'>Calendar</p>
                </div>
            </InitialLoading>
        </div>
    )
}

export default Page
