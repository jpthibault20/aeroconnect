/**
 * @file SessionsOfDay.tsx
 * @brief Component that displays all flight sessions for a selected date.
 * 
 * @details
 * This component filters and sorts flight sessions based on the selected date 
 * and displays them using the SessionDisplay component.
 */

import { FLIGHT_SESSION } from '@prisma/client';
import React, { useEffect, useState } from 'react';
import SessionDisplay from './SessionDisplay';

/**
 * @interface Props
 * @brief Interface for the component props.
 * @property {FLIGHT_SESSION[]} flightsSessions - Array of flight sessions to filter and display.
 * @property {Date} selectDate - The date for which to display flight sessions.
 */
interface Props {
    flightsSessions: FLIGHT_SESSION[];
    selectDate: Date;
}

/**
 * @component SessionsOfDay
 * @description Renders the flight sessions for a selected date.
 * 
 * @param {Props} props - The component props.
 * @returns {JSX.Element} The rendered component.
 */
const SessionsOfDay = ({ flightsSessions, selectDate }: Props) => {
    const [sessionOfTheDay, setSessionOfTheDay] = useState<FLIGHT_SESSION[]>();

    useEffect(() => {
        try {
            // Check if flightsSessions is provided and filter/sort sessions for the selected date
            if (flightsSessions) {
                setSessionOfTheDay(filterAndSortFlightSessionsByDate(selectDate, flightsSessions));
            } else {
                throw new Error('Aucune session trouvée');
            }
        } catch (error) {
            console.log(error);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectDate, flightsSessions]);

    /**
     * Function to filter flight sessions by the target date and sort them chronologically.
     * @param {Date} targetDate - The target date for filtering sessions.
     * @param {FLIGHT_SESSION[]} sessions - Array of FLIGHT_SESSION objects.
     * @returns {FLIGHT_SESSION[]} An array of flight sessions that match the target date, sorted chronologically.
     */
    function filterAndSortFlightSessionsByDate(targetDate: Date, sessions: FLIGHT_SESSION[]): FLIGHT_SESSION[] {
        // Filter sessions based on the target date
        const filteredSessions = sessions.filter(session => {
            const sessionDate = session.sessionDateStart;

            // Compare year, month, and day
            return (
                sessionDate.getFullYear() === targetDate.getFullYear() &&
                sessionDate.getMonth() === targetDate.getMonth() &&
                sessionDate.getDate() === targetDate.getDate()
            );
        });

        // Sort filtered sessions by the start time (sessionDateStart)
        return filteredSessions.sort((a, b) => a.sessionDateStart.getTime() - b.sessionDateStart.getTime());
    }

    return (
        <div className='h-full w-full'>
            <div className='w-full h-full'>
                <p className='font-istok text-2xl p-3'>
                    {selectDate.toLocaleDateString('fr-FR', { day: "2-digit", month: "long", year: "numeric" })}
                </p>
                <div className='w-full space-y-6 flex flex-col items-center pb-24'>
                    {sessionOfTheDay?.map((session, index) => (
                        <SessionDisplay key={index} session={session} />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default SessionsOfDay;
