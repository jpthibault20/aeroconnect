import React, { useState } from 'react'
import RoundDate from './RoundDate'
import { DaysOfMonthType } from '@/api/date'
import { FLIGHT_SESSION } from '@prisma/client'
import { getFlightSessionsForDay } from "@/api/date"
import { on } from 'events'

interface props {
    daysOfMonth: DaysOfMonthType | undefined
    date: Date
    flightsSessionsExemple: FLIGHT_SESSION[]
    setSelectDate: React.Dispatch<React.SetStateAction<Date>>
    selectDate: Date

}

const Calendar = ({ daysOfMonth, date, flightsSessionsExemple, setSelectDate, selectDate }: props) => {

    const onClickDay = (date: Date) => {
        setSelectDate(date)
    }

    const checkSelectDate = (date: Date) => {
        if (date.getFullYear() === selectDate.getFullYear() &&
            date.getMonth() === selectDate.getMonth() &&
            date.getDate() === selectDate.getDate())
            return true
        return false
    }

    return (
        <table className='min-w-full table-auto mt-6 items-center justify-center'>
            <thead>
                <tr>
                    <th className='w-[14.2857%]'>L</th>
                    <th className='w-[14.2857%]'>M</th>
                    <th className='w-[14.2857%]'>M</th>
                    <th className='w-[14.2857%]'>J</th>
                    <th className='w-[14.2857%]'>V</th>
                    <th className='w-[14.2857%]'>S</th>
                    <th className='w-[14.2857%]'>D</th>
                </tr>
            </thead>
            <tbody className=''>
                {daysOfMonth?.map((week, index) => (
                    <tr key={index}>
                        {week.map((day, index) => (
                            <td key={index} className='w-[14.2857%] text-center'>
                                <button
                                    onClick={() => onClickDay(day.fullDate)}
                                    className='flex w-full h-full items-center justify-center mt-4'
                                >
                                    <RoundDate
                                        date={day.date}
                                        isToday={day.isActualDay}
                                        isActualMonth={day.isActualMonth}
                                        flightSession={getFlightSessionsForDay(day.fullDate, flightsSessionsExemple)}
                                        isSelected={checkSelectDate(day.fullDate)}
                                    />
                                </button>
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

export default Calendar
