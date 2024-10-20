import React, { useEffect, useState } from 'react'
import InitialLoading from '../InitialLoading'
import DaySelector from './DaySelector'
import { flightsSessionsExemple } from '@/config/exempleData'
import Filter from './phone/Filter'
import { DaysOfMonthType, getCompleteWeeks, getFlightSessionsForDay } from '@/api/date'
import Calendar from './phone/calendar'
import SessionOfDay from "@/components/calendar/phone/SessionsOfDay"
import { FLIGHT_SESSION } from '@prisma/client'

const GlobalCalendarPhone = () => {
    const [date, setDate] = useState(new Date())
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [instructor, setInstructor] = useState("")
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [plane, setPlane] = useState("")
    const [daysOfMonth, setDaysOfMonth] = useState<DaysOfMonthType>()
    const [sessionOfSelectedDay, setSessionOfSelectedDay] = useState<FLIGHT_SESSION[]>()
    const [selectDate, setSelectDate] = useState(new Date)

    useEffect(() => {
        setSessionOfSelectedDay(getFlightSessionsForDay(selectDate, flightsSessionsExemple))
    }, [selectDate])

    useEffect(() => {
        try {
            const res = getCompleteWeeks(date)
            setDaysOfMonth(res)
        } catch (error) {
            console.log(error)
        }
    }, [date])

    const onClickNextweek = () => {
        setDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setMonth(newDate.getMonth() + 1);
            return newDate;
        });
    }

    const onClickPreviousWeek = () => {
        setDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setMonth(newDate.getMonth() - 1);
            return newDate;
        });
    }

    const onClickToday = () => {
        setDate(new Date())
    }

    return (
        <InitialLoading className='xl:hidden flex flex-col flex-grow overflow-y-auto'> {/* Use h-screen to ensure the full height */}
            <p className='text-2xl font-istok font-semibold my-3 w-full text-center'>Calendrier</p>
            <div className='w-full px-6'>
                <div className='border-b border-[#646464] w-full' />
            </div>
            <div className='w-full mt-6'> {/* flex-grow and overflow-y-auto for scrollable content */}
                <p className='text-4xl font-istok pl-6 mb-3'>
                    {date.toLocaleDateString('fr-FR', { month: 'long' })}, {date.toLocaleDateString('fr-FR', { year: 'numeric' })}
                </p>
                <div className='flex w-full px-6'>
                    <DaySelector
                        className='w-full flex'
                        onClickNextWeek={onClickNextweek}
                        onClickPreviousWeek={onClickPreviousWeek}
                        onClickToday={onClickToday}
                    />
                    <Filter
                        setInstructor={setInstructor}
                        setPlane={setPlane}
                    />
                </div>

                <Calendar daysOfMonth={daysOfMonth} date={date} flightsSessionsExemple={flightsSessionsExemple} setSelectDate={setSelectDate} selectDate={selectDate} />
            </div>

            <div className='w-full bg-[#E4E7ED] border-t border-[#646464] mt-6 overflow-y-auto'> {/* Make the sessions part scrollable */}
                <SessionOfDay sessionOfSelectedDay={sessionOfSelectedDay} selectDate={selectDate} />
            </div>
        </InitialLoading>
    )
}

export default GlobalCalendarPhone
