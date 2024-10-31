/**
 * @file Page.js
 * @brief This file renders the main calendar view for both desktop and mobile devices.
 *
 * It imports two key components, `GlobalCalendarDesktop` and `GlobalCalendarPhone`,
 * to handle the display of a calendar on desktop and mobile screens, respectively.
 * The page ensures responsiveness by rendering the appropriate component based on the device.
 */

"use client"
import React, { useEffect, useState } from 'react'
import GlobalCalendarDesktop from '@/components/calendar/GlobalCalendarDesktop';
import GlobalCalendarPhone from '@/components/calendar/phone/GlobalCalendarPhone';
import InitialLoading from '@/components/InitialLoading';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { getAllSessions } from '@/api/db/session';
import { flight_sessions } from '@prisma/client';

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
    const { currentUser } = useCurrentUser();
    const [sessions, setSessions] = useState<flight_sessions[]>([]);
    const [reload, setReload] = useState(false);

    useEffect(() => {
        const fetchSessions = async () => {
            if (currentUser) {
                try {
                    const res = await getAllSessions(currentUser.clubID);
                    if (Array.isArray(res)) {
                        // for (let i = 0; i < sessions.length; i++) {
                        //     sessions[i].sessionDateStart.setUTCHours(sessions[i].sessionDateStart.getUTCHours())
                        // }
                        setSessions(res);
                    } else {
                        console.log('Unexpected response format:', res);
                    }
                } catch (error) {
                    console.log(error);
                }
            }
        }

        fetchSessions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, reload]);

    useEffect(() => {
        if (sessions.length > 0) {
            console.log(sessions[0].sessionDateStart.getFullYear(), sessions[0].sessionDateStart.getMonth(), sessions[0].sessionDateStart.getDate(), sessions[0].sessionDateStart.getHours(), sessions[0].sessionDateStart.getMinutes());
            console.log(sessions[0].sessionDateStart.getUTCFullYear(), sessions[0].sessionDateStart.getUTCMonth(), sessions[0].sessionDateStart.getUTCDate(), sessions[0].sessionDateStart.getUTCHours(), sessions[0].sessionDateStart.getUTCMinutes());
        }
    }, [sessions]);

    return (
        // Full height and width container to ensure the calendar takes up the entire page space.
        <InitialLoading className='h-full w-full'>
            <GlobalCalendarDesktop sessions={sessions} reload={reload} setReload={setReload} />
            <GlobalCalendarPhone sessions={sessions} reload={reload} setReload={setReload} />
        </InitialLoading>
    )
}

export default Page
