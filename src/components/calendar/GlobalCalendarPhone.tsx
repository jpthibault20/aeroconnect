import React, { useEffect, useState } from 'react'
import InitialLoading from '../InitialLoading'
import DaySelector from './DaySelector'
import { flightsSessionsExemple } from '@/config/exempleData'
import Filter from './phone/Filter'
import { DaysOfMonthType, getCompleteWeeks } from '@/api/date'
import Calendar from './phone/calendar'
import SessionOfDay from "@/components/calendar/phone/SessionsOfDay"
import { filterFlightSessions } from '@/api/db/dbClient'
import { FLIGHT_SESSION } from '@prisma/client'

const GlobalCalendarPhone = () => {
    const [date, setDate] = useState(new Date())
    const [instructor, setInstructor] = useState("")
    const [plane, setPlane] = useState("")
    const [daysOfMonth, setDaysOfMonth] = useState<DaysOfMonthType>()
    const [selectDate, setSelectDate] = useState(new Date)
    const [sessionFiltered, setSessionFiltered] = useState<FLIGHT_SESSION[]>([{
        id: 0,
        clubID: 0,
        sessionDateStart: new Date,
        sessionDateDuration_min: 0,
        finalReccurence: 0,
        flightType: "FIRST_FLIGHT",
        pilotID: 0,
        pilotFirstName: "",
        pilotLastName: "",
        studentID: 0,
        studentFirstName: "",
        studentLastName: "",
        student_type: "FIRST_FLIGHT",
        planeID: 0,
        planeName: "",
    }]);


    useEffect(() => {
        if (instructor === ' ') setInstructor('')
        if (plane === ' ') setPlane('')

        setSessionFiltered(filterFlightSessions(flightsSessionsExemple, instructor, plane))

    }, [instructor, plane])

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
        <InitialLoading className='xl:hidden flex flex-col flex-grow h-full'> {/* Use h-screen to ensure the full height */}
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
                        instructor={instructor}
                        plane={plane}
                    />
                </div>

                <Calendar daysOfMonth={daysOfMonth} date={date} flightsSessions={sessionFiltered} setSelectDate={setSelectDate} selectDate={selectDate} />
            </div>

            <div className='w-full bg-[#E4E7ED] border-t border-[#646464] mt-6 h-full'> {/* Make the sessions part scrollable */}
                <SessionOfDay selectDate={selectDate} flightsSessions={sessionFiltered} />
            </div>
        </InitialLoading>
    )
}

export default GlobalCalendarPhone
