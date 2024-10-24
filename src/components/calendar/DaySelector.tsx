/**
 * @file DaySelector.js
 * @brief Component for navigating through calendar days (previous week, current day, next week).
 * 
 * This component provides buttons for navigating the calendar by weeks and a button to reset the view to the current day.
 * It receives optional functions to handle each navigation action and displays them with icons and labels.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react'

interface props {
    className?: string;   ///< Optional additional CSS classes for styling.
    onClickNextWeek?: () => void;  ///< Function triggered when clicking the "next week" button.
    onClickPreviousWeek?: () => void; ///< Function triggered when clicking the "previous week" button.
    onClickToday?: () => void; ///< Function triggered when clicking the "today" button.
}

/**
 * @function DaySelector
 * @brief Renders navigation buttons for the calendar (previous week, today, next week).
 * 
 * The `DaySelector` component provides buttons for navigating the calendar by weeks
 * (previous and next) and a button to return to the current week ("Aujourd'hui").
 * Each button triggers a corresponding callback function passed as props.
 * 
 * @param {string} className - Additional CSS classes for styling the container.
 * @param {function} onClickNextWeek - Callback for navigating to the next week.
 * @param {function} onClickPreviousWeek - Callback for navigating to the previous week.
 * @param {function} onClickToday - Callback for resetting to today's date.
 * 
 * @returns {JSX.Element} The rendered navigation button group.
 */
const DaySelector = ({ className, onClickNextWeek, onClickPreviousWeek, onClickToday }: props) => {
    return (
        <div className={`${className} space-x-1 p-1`}>
            {/* Button to navigate to the previous week */}
            <button
                onClick={onClickPreviousWeek}
                className='flex bg-[#F2F2F2] px-1 py-0.5 rounded-sm'
            >
                <ChevronLeft />
            </button>

            {/* Button to reset the calendar to today's date */}
            <button
                onClick={onClickToday}
                className='flex bg-[#F2F2F2] px-3 py-0.5 rounded-sm'
            >
                Aujourd&apos;hui
            </button>

            {/* Button to navigate to the next week */}
            <button
                onClick={onClickNextWeek}
                className='flex bg-[#F2F2F2] px-1 py-0.5 rounded-sm'
            >
                <ChevronRight />
            </button>
        </div>
    )
}

export default DaySelector
