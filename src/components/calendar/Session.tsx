import { DayInfo, getDaysOfWeek } from '@/api/date';
import { FLIGHT_SESSION } from '@prisma/client';
import React from 'react'

interface props {
    indexX: number;
    indexY: number;
    tabDays: string[];
    tabHours: number[];
    events: FLIGHT_SESSION | any[];
    date: Date;
}

const Session = ({ indexX, indexY, tabDays, tabHours, events, date }: props) => {
    const daysOfWeek = getDaysOfWeek(date);

    // console.log("tabday : ", tabDays)
    // console.log("tab hour : ", tabHours)
    // console.log("event : ", events)
    // console.log(date)




    const sessionDate = new Date(date.getFullYear(), daysOfWeek[indexY].month, daysOfWeek[indexY].dayNumber, Math.floor(tabHours[indexX]), Number((tabHours[indexX] % 1).toFixed(2).substring(2)), 0)

    // console.log(date.getFullYear(), date.getMonth(), daysOfWeek[indexY].dayNumber, tabHours[indexX], 0, 0)
    // console.log("session date : ", sessionDate)

    return (
        <div className='flex justify-center items-center bg-[#B9DFC1] rounded-md h-full w-full'>
            {sessionDate.toLocaleString('default')}
        </div>
    )
}

export default Session
