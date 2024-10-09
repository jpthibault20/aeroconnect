"use client"
import React from 'react'
import GlobalCalendarDesktop from '@/components/calendar/GlobalCalendarDesktop';
import GlobalCalendarPhone from '@/components/calendar/GlobalCalendarPhone';


const Page = () => {

    return (
        <div className='h-full'>
            <GlobalCalendarDesktop />
            <GlobalCalendarPhone />
        </div>
    )
}

export default Page
