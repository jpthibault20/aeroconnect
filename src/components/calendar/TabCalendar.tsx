/**
 * @file TabCalendar.js
 * @brief Component for rendering the weekly calendar table with filtered flight sessions.
 * 
 * This component displays a calendar view for the week starting from a given date. 
 * It shows the working hours on the vertical axis and days of the week on the horizontal axis.
 * Flight sessions can be filtered by instructor and plane.
 */

import React from 'react';
import { workingHour } from '@/config/configClub';
import { dayFr } from '@/config/date';
import { formatTime, getDaysOfWeek } from '@/api/date';
import Session from '../Session';
import { flight_sessions } from '@prisma/client';

interface Props {
    className?: string;          ///< Optional CSS class for styling.
    date: Date;                  ///< The date from which the week is displayed.
    sessions: flight_sessions[]///< Filter to display sessions for a specific plane.
}

/**
 * @function TabCalendar
 * @brief Renders a calendar table with filtered flight sessions.
 * 
 * The `TabCalendar` component displays a weekly calendar with working hours and days of the week.
 * It filters flight sessions based on the selected instructor and plane. Each session is displayed 
 * in the appropriate cell of the table, representing a time slot and a day.
 * 
 * @param {Date} date - The reference date to display the week.
 * @param {string} instructorFilter - Filter for displaying only sessions of a specific instructor.
 * @param {string} planeFilter - Filter for displaying only sessions of a specific plane.
 * 
 * @returns The rendered weekly calendar with filtered sessions.
 */
const TabCalendar = ({ date, sessions }: Props) => {
    // Get the days of the current week based on the reference date
    const daysOfWeek = getDaysOfWeek(date);

    return (
        <div className="w-full h-full">
            {/* Render the table structure for the calendar */}
            <div className="table w-full h-full table-fixed">
                {/* Render the header row for the days of the week */}
                <div className="table-header-group">
                    <div className="table-row">
                        <div className="table-cell w-20" />
                        {daysOfWeek.map((item, index) => (
                            <div className="table-cell p-1" key={index}>
                                <div
                                    className={`font-bold text-center rounded-md ${item.isToday ? 'bg-[#373573]' : ''}`}
                                >
                                    <p className={`font-istok text-xl ${item.isToday ? 'text-white' : 'text-black'}`}>
                                        {item.dayName} {/* Day name (e.g., Monday) */}
                                    </p>
                                    <p className={`font-istok font-semibold text-xl text-center ${item.isToday ? 'text-white' : 'text-black'}`}>
                                        {item.dayNumber} {/* Day number (e.g., 12) */}
                                    </p>
                                </div>
                                <div className="h-3" />
                            </div>
                        ))}
                    </div>
                </div>
                {/* Render the rows for each working hour */}
                <div className="table-row-group h-full bg-[#E4E7ED] ">
                    {workingHour.map((hour, index) => (
                        <div key={index} className="table-row">
                            {/* Render the working hour in the first column */}
                            <div
                                className={`table-cell pl-3 text-center font-istok font-semibold text-[#646464] align-middle ${index === 0 ? 'border-t-2 border-[#A5A5A5]' : ''} w-20`}
                            >
                                {formatTime(hour)} {/* Display formatted hour */}
                            </div>
                            {/* Render the cells for each day in the week */}
                            {dayFr.map((item, indexday) => (
                                <div
                                    className={`table-cell p-1 border-b border-[#C1C1C1] ${index === 0 ? 'border-t-2 border-[#A5A5A5]' : ''}`}
                                    key={indexday}
                                >
                                    <Session
                                        indexX={index}      ///< Index for the time slot.
                                        indexY={indexday}   ///< Index for the day.
                                        tabDays={dayFr}     ///< List of days (e.g., Monday to Sunday).
                                        tabHours={workingHour} ///< List of working hours.
                                        events={sessions} ///< List of filtered sessions.
                                        date={date}         ///< The current reference date.
                                    />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default TabCalendar;
