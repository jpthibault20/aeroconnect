/**
 * @file GlobalCalendarDesktop.js
 * @brief This component renders the desktop version of the calendar with filters for instructors and planes.
 * 
 * The component includes logic for navigating through weeks, selecting the current day, and filtering by instructor and plane. 
 * It is optimized for larger screens (hidden on smaller screens) and provides a smooth user experience for scheduling sessions.
 */
import React, { useState } from 'react'
import { monthFr } from '@/config/date';
import DaySelector from './DaySelector';
import TabCalendar from './TabCalendar';
import NewSession from "@/components/NewSession"
import Filter from './Filter';
import { flight_sessions } from '@prisma/client';

interface Props {
    sessions: flight_sessions[];
    reload: boolean;
    setReload: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * @function GlobalCalendarDesktop
 * @brief Main desktop calendar component with navigation and filters.
 *
 * This component allows the user to navigate between weeks, select today's date, 
 * and filter calendar sessions by instructor and plane. It renders the calendar 
 * within a desktop-only layout, hidden on mobile devices.
 * 
 */
const GlobalCalendarDesktop = ({ sessions, reload, setReload }: Props) => {
    const [date, setDate] = useState(new Date());
    const [sessionsFlitered, setSessionsFiltered] = useState<flight_sessions[]>(sessions);



    /**
     * @function onClickNextweek
     * @brief Advances the calendar by one week.
     *
     * This function modifies the `date` state by adding 7 days, effectively moving to the next week.
     */
    const onClickNextweek = () => {
        console.log('Next day')
        setDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setDate(newDate.getDate() + 7);
            return newDate;
        });
    }

    /**
     * @function onClickPreviousWeek
     * @brief Moves the calendar back by one week.
     *
     * This function modifies the `date` state by subtracting 7 days, moving back to the previous week.
     */
    const onClickPreviousWeek = () => {
        console.log('Previous day')
        setDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setDate(newDate.getDate() - 7);
            return newDate;
        });
    }

    /**
     * @function onClickToday
     * @brief Resets the calendar to the current week.
     *
     * This function sets the `date` state to today's date, bringing the calendar back to the current week.
     */
    const onClickToday = () => {
        console.log('Today')
        setDate(new Date())
    }

    return (
        // Only rendered on large screens (hidden on smaller screens), includes a loading state.
        <div className='hidden xl:block h-full'>
            <div className="flex flex-col h-full overflow-y-auto">
                <div className="w-full flex items-center my-6">
                    {/* Displays the current month and year at the top of the calendar. */}
                    <p className="text-5xl font-istok pl-3">
                        {monthFr[date.getMonth()]}, {date.getFullYear()}
                    </p>
                    <div className='flex-1'>
                        <div className='w-full flex justify-between items-end pl-6'>
                            {/* Day selector component allowing navigation between weeks. */}
                            <DaySelector
                                className="h-full flex items-end"
                                onClickNextWeek={onClickNextweek}
                                onClickPreviousWeek={onClickPreviousWeek}
                                onClickToday={onClickToday}
                            />
                            <div className='flex space-x-2 px-3 '>
                                {/* Button to create a new session (desktop view only). */}
                                <div>
                                    <NewSession display='desktop' reload={reload} setReload={setReload} />
                                </div>
                                <Filter sessions={sessions} setSessionsFiltered={setSessionsFiltered} display='desktop' />

                            </div>
                        </div>
                    </div>
                </div>
                <div className='h-full'>
                    {/* Main calendar table with the applied filters (instructor and plane). */}
                    <TabCalendar
                        date={date}
                        sessions={sessionsFlitered}
                    />
                </div>
            </div>
        </div>
    )
}

export default GlobalCalendarDesktop
