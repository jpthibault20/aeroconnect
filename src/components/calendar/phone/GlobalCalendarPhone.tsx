/**
 * @file GlobalCalendarPhone.tsx
 * @brief This component renders a calendar view for mobile devices.
 * It allows users to select a date, filter flight sessions by instructor and plane,
 * and view sessions for a specific day. It also includes functionalities for navigating
 * between weeks and creating new flight sessions.
 * 
 * @details
 * - Utilizes React hooks for state management and lifecycle methods.
 * - Integrates components for loading states, day selection, filtering, and session display.
 * - Fetches and filters flight session data based on user input.
 */

import React, { useEffect, useState } from 'react';
import DaySelector from './../DaySelector';
import { flightsSessionsExemple } from '@/config/exempleData';
import Filter from './../phone/Filter';
import { DaysOfMonthType, getCompleteWeeks } from '@/api/date';
import Calendar from './../phone/calendar';
import SessionOfDay from "@/components/calendar/phone/SessionsOfDay";
import { filterFlightSessions } from '@/api/db/dbClient';
import { FLIGHT_SESSION } from '@prisma/client';
import NewSession from "@/components/calendar/NewSession";

/**
 * @component GlobalCalendarPhone
 * @description Main component for displaying a calendar on mobile devices.
 * Handles date selection, session filtering, and session display.
 */
const GlobalCalendarPhone = () => {
    // State variables for managing date, instructor, plane, and filtered sessions
    const [date, setDate] = useState(new Date());
    const [instructor, setInstructor] = useState("");
    const [plane, setPlane] = useState("");
    const [daysOfMonth, setDaysOfMonth] = useState<DaysOfMonthType>();
    const [selectDate, setSelectDate] = useState(new Date());
    const [sessionFiltered, setSessionFiltered] = useState<FLIGHT_SESSION[]>([{
        id: 0,
        clubID: "",
        sessionDateStart: new Date(),
        sessionDateDuration_min: 0,
        finalReccurence: null,
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

    // Effect to filter sessions when instructor or plane changes
    useEffect(() => {
        // Reset instructor and plane if they are empty strings
        if (instructor === ' ') setInstructor('');
        if (plane === ' ') setPlane('');

        // Filter flight sessions based on instructor and plane
        setSessionFiltered(filterFlightSessions(flightsSessionsExemple, instructor, plane));
    }, [instructor, plane]);

    // Effect to get complete weeks for the selected date
    useEffect(() => {
        try {
            const res = getCompleteWeeks(date);
            setDaysOfMonth(res);
        } catch (error) {
            console.log(error);
        }
    }, [date]);

    // Handler to navigate to the next month
    const onClickNextweek = () => {
        setDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setMonth(newDate.getMonth() + 1);
            return newDate;
        });
    };

    // Handler to navigate to the previous month
    const onClickPreviousWeek = () => {
        setDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setMonth(newDate.getMonth() - 1);
            return newDate;
        });
    };

    // Handler to set the date to today
    const onClickToday = () => {
        setDate(new Date());
    };

    return (
        <div className='xl:hidden flex flex-col flex-grow h-full'> {/* Use h-screen to ensure the full height */}
            <p className='text-2xl font-istok font-semibold my-3 w-full text-center'>Calendrier</p>
            <div className='w-full px-6'>
                <div className='border-b border-[#646464] w-full' />
            </div>
            <div className='w-full mt-6'> {/* flex-grow and overflow-y-auto for scrollable content */}
                <div className='flex justify-between px-6'>
                    <p className='text-4xl font-istok mb-3'>
                        {date.toLocaleDateString('fr-FR', { month: 'long' })}, {date.toLocaleDateString('fr-FR', { year: 'numeric' })}
                    </p>
                    <div>
                        <NewSession display='phone' />
                    </div>
                </div>
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

                <Calendar
                    daysOfMonth={daysOfMonth}
                    date={date}
                    flightsSessions={sessionFiltered}
                    setSelectDate={setSelectDate}
                    selectDate={selectDate}
                />
            </div>

            <div className='w-full bg-[#E4E7ED] border-t border-[#646464] mt-6 h-full'> {/* Make the sessions part scrollable */}
                <SessionOfDay selectDate={selectDate} flightsSessions={sessionFiltered} />
            </div>
        </div>
    );
};

export default GlobalCalendarPhone;
