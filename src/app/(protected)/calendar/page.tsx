/**
 * @file Page.js
 * @brief This file renders the main calendar view for both desktop and mobile devices.
 *
 * It imports two key components, `GlobalCalendarDesktop` and `GlobalCalendarPhone`,
 * to handle the display of a calendar on desktop and mobile screens, respectively.
 * The page ensures responsiveness by rendering the appropriate component based on the device.
 */

"use client"
import React from 'react'
import GlobalCalendarDesktop from '@/components/calendar/GlobalCalendarDesktop';
import GlobalCalendarPhone from '@/components/calendar/phone/GlobalCalendarPhone';
import InitialLoading from '@/components/InitialLoading';

/**
 * @function Page
 * @brief Main component rendering the responsive calendar view.
 *
 * This component contains a wrapper `<div>` that spans the full width and height of the page (`h-full w-full`).
 * Inside the `<div>`, it renders two components: one for the desktop view (`GlobalCalendarDesktop`) 
 * and one for the mobile view (`GlobalCalendarPhone`).
 * 
 */
const Page = () => {

    return (
        // Full height and width container to ensure the calendar takes up the entire page space.
        <InitialLoading className='h-full w-full'>
            <GlobalCalendarDesktop />
            <GlobalCalendarPhone />
        </InitialLoading>
    )
}

export default Page
