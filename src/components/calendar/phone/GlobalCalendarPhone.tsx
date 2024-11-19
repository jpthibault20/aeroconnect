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
import { DaysOfMonthType, getCompleteWeeks } from '@/api/date';
import Calendar from './../phone/calendar';
import SessionOfDay from "@/components/calendar/phone/SessionsOfDay";
import NewSession from "@/components/NewSession";
import Filter from '../Filter';
import { flight_sessions } from '@prisma/client';
import { Spinner } from '@/components/ui/SpinnerVariants';

interface Props {
    sessions: flight_sessions[];
    reload: boolean;
    setReload: React.Dispatch<React.SetStateAction<boolean>>;
    loading: boolean;
    setMonthSelected: React.Dispatch<React.SetStateAction<Date>>;
}

/**
 * @component GlobalCalendarPhone
 * @description Main component for displaying a calendar on mobile devices.
 * Handles date selection, session filtering, and session display.
 */
const GlobalCalendarPhone = ({ sessions, reload, setReload, loading, setMonthSelected }: Props) => {
    // State variables for managing date, instructor, plane, and filtered sessions
    const [date, setDate] = useState(new Date());
    const [daysOfMonth, setDaysOfMonth] = useState<DaysOfMonthType>();
    const [selectDate, setSelectDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
    const [sessionsFlitered, setSessionsFiltered] = useState<flight_sessions[]>(sessions);


    // Effect to get complete weeks for the selected date
    useEffect(() => {
        try {
            const res = getCompleteWeeks(date);
            setDaysOfMonth(res);
        } catch (error) {
            console.log(error);
        }
        setMonthSelected(date);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date]);

    // Handler to navigate to the next month
    const onClickNextweek = () => {
        setDate(prevDate => {
            prevDate.setDate(1);
            const newDate = new Date(prevDate);
            newDate.setMonth(newDate.getMonth() + 1);
            return newDate;
        });
    };

    // Handler to navigate to the previous month
    const onClickPreviousWeek = () => {
        setDate(prevDate => {
            prevDate.setDate(1);
            const newDate = new Date(prevDate);
            newDate.setMonth(newDate.getMonth() - 1);
            return newDate;
        });
    };

    // Handler to set the date to today
    const onClickToday = () => {
        setDate(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
    };

    return (
        <div className='lg:hidden flex flex-col flex-grow h-full'> {/* Use h-screen to ensure the full height */}
            <p className='text-2xl font-istok font-semibold my-3 w-full text-center'>Calendrier</p>
            <div className='w-full px-6'>
                <div className='border-b border-[#646464] w-full' />
            </div>
            <div className='w-full mt-6'> {/* flex-grow and overflow-y-auto for scrollable content */}
                <div className='flex justify-between px-6'>
                    <p className='text-4xl font-istok mb-3'>
                        {date.toLocaleDateString('fr-FR', { month: 'long' })}, {date.toLocaleDateString('fr-FR', { year: 'numeric' })}
                    </p>
                    <div className='flex items-center space-x-3'>
                        <NewSession display='phone' reload={reload} setReload={setReload} />
                        <Filter sessions={sessions} setSessionsFiltered={setSessionsFiltered} display='phone' />
                    </div>
                </div>
                <div className='flex w-full px-6'>
                    <DaySelector
                        className='w-full flex'
                        onClickNextWeek={onClickNextweek}
                        onClickPreviousWeek={onClickPreviousWeek}
                        onClickToday={onClickToday}
                    />

                </div>
                {loading ? (
                    <div>
                        <Spinner />
                        <p className='text-center'>
                            Chargement des sessions ...
                        </p>
                    </div>
                ) : (
                    <Calendar
                        daysOfMonth={daysOfMonth}
                        date={date}
                        flightsSessions={sessionsFlitered}
                        setSelectDate={setSelectDate}
                        selectDate={selectDate}
                    />
                )}
            </div>

            <div className='w-full bg-[#E4E7ED] border-t border-[#646464] mt-6 h-full'> {/* Make the sessions part scrollable */}
                <SessionOfDay selectDate={selectDate} flightsSessions={sessionsFlitered} reload={reload} setReload={setReload} />
            </div>
        </div>
    );
};

export default GlobalCalendarPhone;
