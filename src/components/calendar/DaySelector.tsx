/**
 * @file DaySelector.js
 * @brief Component for navigating through calendar days (previous week, current day, next week).
 * 
 * This component provides buttons for navigating the calendar by weeks and a button to reset the view to the current day.
 * It receives optional functions to handle each navigation action and displays them with icons and labels.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react'
import { Button } from '../ui/button';

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
 */
const DaySelector = ({ className, onClickNextWeek, onClickPreviousWeek, onClickToday }: props) => {
    return (
        <div className={`${className} space-x-1 p-1`}>
            {/* Button to navigate to the previous week */}
            <Button
                variant="ghost"
                size="icon"
                onClick={onClickPreviousWeek}
                className="h-8 w-8"
            >
                <ChevronLeft className="h-6 w-6" />
            </Button>


            {/* Button to reset the calendar to today's date */}
            <Button
                variant="outline"
                size="sm"
                onClick={onClickToday}
            >
                Aujourd&apos;hui
            </Button>


            {/* Button to navigate to the next week */}
            <Button
                variant="ghost"
                size="icon"
                onClick={onClickNextWeek}
                className="h-8 w-8"
            >
                <ChevronRight className="h-6 w-6" />
            </Button>
        </div>
    )
}

export default DaySelector
