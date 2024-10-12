import { getDaysOfWeek, getSessionsFromDate } from '@/api/date';
import { FLIGHT_SESSION } from '@prisma/client';
import React from 'react'

interface props {
    indexX: number;
    indexY: number;
    tabDays: string[];
    tabHours: number[];
    events: FLIGHT_SESSION | unknown[];
    date: Date;
}

const Session = ({ indexX, indexY, tabHours, events, date }: props) => {
    const daysOfWeek = getDaysOfWeek(date);

    const sessionDate = new Date(date.getFullYear(), daysOfWeek[indexY].month, daysOfWeek[indexY].dayNumber, Math.floor(tabHours[indexX]), Number((tabHours[indexX] % 1).toFixed(2).substring(2)), 0)

    const sessions = getSessionsFromDate(sessionDate, events as FLIGHT_SESSION[])


    return (
        <div className='flex justify-center items-center bg-[#B9DFC1] rounded-md h-full w-full'>
            {sessions.length}
        </div>
    )
}

export default Session
