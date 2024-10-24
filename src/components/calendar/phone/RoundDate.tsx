/**
 * @file RoundDate.tsx
 * @brief Component that represents a round date in the calendar.
 * 
 * @details
 * This component displays a date in a circular format, with color coding
 * based on the availability of flight sessions. It also indicates whether
 * the date is today, part of the current month, or selected.
 */

"use client";
import { FLIGHT_SESSION } from "@prisma/client";
import React from "react";

/**
 * @interface Props
 * @brief Interface for the component props.
 * @property {number} date - The date to display.
 * @property {boolean} isToday - Indicates if the date is today.
 * @property {boolean} isActualMonth - Indicates if the date is in the current month.
 * @property {boolean} [isSelected] - Indicates if the date is selected.
 * @property {FLIGHT_SESSION[]} flightSession - List of flight sessions associated with the date.
 */
interface Props {
    date: number;
    isToday: boolean;
    isActualMonth: boolean;
    isSelected?: boolean;
    flightSession: FLIGHT_SESSION[];
}

/**
 * @component RoundDate
 * @description Renders a circular representation of a date with color coding
 * based on flight session availability.
 * 
 * @param {Props} props - The component props.
 * @returns {JSX.Element} The rendered component.
 */
const RoundDate = ({ date, isToday, isActualMonth, isSelected, flightSession }: Props) => {
    let color = "#D9D9D9"; // Default color
    let oppacityColor = "#EBEBEB"; // Default opacity color

    // Filter available and booked flight sessions
    const flightSessionAvailable = flightSession.filter((session) => session.studentID === null);
    const flightSessionBooked = flightSession.filter((session) => session.studentID !== null);

    // Set colors based on session availability
    if (flightSessionAvailable.length > 0) {
        color = "#B9DFC1"; // Color for available sessions
        oppacityColor = "#E4F3E7"; // Opacity color for available sessions
    } else if (flightSessionBooked.length > 0) {
        color = "#DBA8A8"; // Color for booked sessions
        oppacityColor = "#ECD3D3"; // Opacity color for booked sessions
    }

    // Style for opacity based on the current month
    const oppacityStyle = {
        backgroundColor: isActualMonth ? oppacityColor : "transparent",
    };

    // Style for the main color based on the current month
    const style = {
        backgroundColor: isActualMonth ? color : "transparent",
    };

    // Render the component based on whether the date is selected
    if (isSelected) {
        return (
            <div style={oppacityStyle} className="flex justify-center items-center bg-opacity-50 h-[40px] w-[40px] rounded-full">
                <div style={style} className="flex justify-center items-center h-[25px] w-[25px] rounded-full">
                    <p className={`${isToday ? 'font-bold' : 'font-normal'} text-sm font-istok`}>
                        {isActualMonth ? date : null}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className='text-sm font-istok flex'>
            <div className={`${isToday ? 'font-bold' : 'font-normal'} flex justify-center items-center rounded-full h-[40px] w-[40px]`}
                style={style}
            >
                <p>
                    {isActualMonth ? date : null}
                </p>
            </div>
        </div>
    );
}

export default RoundDate;
