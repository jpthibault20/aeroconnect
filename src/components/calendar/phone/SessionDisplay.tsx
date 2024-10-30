/**
 * @file SessionDisplay.tsx
 * @brief Component that displays a flight session in the calendar.
 * 
 * @details
 * This component renders the details of a flight session, including the start
 * and end times, pilot name, and plane name. The display changes based on 
 * whether the session is booked or available.
 */

import { flight_sessions } from '@prisma/client';
import React from 'react';
import { formatPilotName } from '@/api/global function/formatPilotName';

/**
 * @interface Props
 * @brief Interface for the component props.
 * @property {flight_sessions} session - The flight session to display.
 */
interface Props {
    session: flight_sessions;
}

/**
 * @component SessionDisplay
 * @description Renders the details of a flight session.
 * 
 * @param {Props} props - The component props.
 * @returns {JSX.Element} The rendered component.
 */
const SessionDisplay = ({ session }: Props) => {

    // Set the background color based on whether the session is booked
    const backgroundStyle = {
        backgroundColor: session.studentID ? "#CB8A8A" : "#B9DFC1",
    };

    // Calculate the final date by adding the session duration to the start date
    const finalDate = new Date(session.sessionDateStart);
    finalDate.setMinutes(finalDate.getMinutes() + session.sessionDateDuration_min);

    return (
        <div
            style={backgroundStyle}
            className={`w-3/4 h-[50px] flex rounded-xl px-3 ${session.studentID ? 'opacity-60' : ''}`}
        >
            <div className='text-xs text-[#646464] flex flex-col justify-center items-center'>
                <p className=''>
                    {session.sessionDateStart.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p>
                    |
                </p>
                <p>
                    {finalDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
            {session.studentID ? (
                <div className='w-full h-full flex justify-center items-center font-istok font-semibold'>
                    <p>
                        - Complet -
                    </p>
                </div>
            ) : (
                <div className='flex w-full justify-between items-center mx-10 font-istok'>
                    <p className='w-full'>
                        {formatPilotName(session.pilotFirstName, session.pilotLastName)}
                    </p>
                    <p className='font-semibold w-full text-center'>
                        {session.planeID.length} {session.planeID.length > 1 ? 'Avions libres' : 'Avion libre'}
                    </p>
                </div>
            )}
        </div>
    );
}

export default SessionDisplay;
