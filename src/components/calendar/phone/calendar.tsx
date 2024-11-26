/**
 * @file Calendar.js
 * @brief Component for rendering a monthly calendar view with selectable days.
 * 
 * This component displays a calendar grid for the current month, allowing the user 
 * to select a specific date. It shows flight sessions on each day, and highlights 
 * the selected day and the current day. Days outside the current month are disabled.
 */

import React from 'react';
import RoundDate from './RoundDate';
import { flight_sessions } from '@prisma/client';
import { getFlightSessionsForDay, DaysOfMonthType } from "@/api/date";

interface props {
    daysOfMonth: DaysOfMonthType | undefined;  ///< List of weeks and days in the month.
    date: Date;                                ///< Current reference date.
    flightsSessions: flight_sessions[];         ///< List of flight sessions.
    setSelectDate: React.Dispatch<React.SetStateAction<Date>>; ///< Function to update the selected date.
    selectDate: Date;                          ///< Currently selected date.
}

/**
 * @function Calendar
 * @brief Renders a calendar table for the current month, with flight sessions on each day.
 * 
 * The `Calendar` component displays a grid representing the current month. Users can select
 * a date by clicking on a day, which will update the selected date. The current day is highlighted,
 * and flight sessions are displayed for each day.
 * 
 * @param {DaysOfMonthType | undefined} daysOfMonth - List of weeks and days for the current month.
 * @param {Date} date - The reference date for the current month.
 * @param {flight_sessions[]} flightsSessions - List of flight sessions to display on the calendar.
 * @param {React.Dispatch<React.SetStateAction<Date>>} setSelectDate - Function to update the selected date.
 * @param {Date} selectDate - The currently selected date.
 * 
 * @returns {JSX.Element} The rendered calendar.
 */
const Calendar = ({ daysOfMonth, flightsSessions, setSelectDate, selectDate }: props) => {

    /**
     * @function onClickDay
     * @brief Handles the event when a day is clicked, updating the selected date.
     * 
     * @param {Date} date - The date that was clicked.
     */
    const onClickDay = (date: Date) => {
        setSelectDate(date);
    }

    /**
     * @function checkSelectDate
     * @brief Checks if a given date matches the currently selected date.
     * 
     * @param {Date} date - The date to check.
     * @returns {boolean} `true` if the date is the selected date, otherwise `false`.
     */
    const checkSelectDate = (date: Date) => {
        return (date.getFullYear() === selectDate.getFullYear() &&
            date.getMonth() === selectDate.getMonth() &&
            date.getDate() === selectDate.getDate());
    }

    return (
        <table className='min-w-full table-auto mt-6 items-center justify-center'>
            <thead>
                <tr>
                    {/* todo : extract the number of columns from the config */}
                    <th className='w-[14.2857%]'>L</th>
                    <th className='w-[14.2857%]'>M</th>
                    <th className='w-[14.2857%]'>M</th>
                    <th className='w-[14.2857%]'>J</th>
                    <th className='w-[14.2857%]'>V</th>
                    <th className='w-[14.2857%]'>S</th>
                    <th className='w-[14.2857%]'>D</th>
                </tr>
            </thead>
            <tbody>
                {daysOfMonth?.map((week, index) => (
                    <tr key={index}>
                        {week.map((day, index) => (
                            <td key={index} className='w-[14.2857%] text-center'>
                                <button
                                    onClick={() => onClickDay(day.fullDate)}
                                    disabled={!day.isActualMonth}
                                    className='flex w-full h-full items-center justify-center mt-4'
                                >
                                    <RoundDate
                                        date={day.date}  ///< The day number to display.
                                        isToday={day.isActualDay}  ///< Boolean indicating if the day is today.
                                        isActualMonth={day.isActualMonth}  ///< Boolean indicating if the day is in the current month.
                                        flightSession={getFlightSessionsForDay(day.fullDate, flightsSessions)}  ///< List of flight sessions for this day.
                                        isSelected={checkSelectDate(day.fullDate)}  ///< Boolean indicating if the day is selected.
                                    />
                                </button>
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default Calendar;
