import { FLIGHT_SESSION } from '@prisma/client'
import React from 'react'

interface props {
    session: FLIGHT_SESSION
}

const SessionDisplay = ({ session }: props) => {

    const backgroundStyle = {
        backgroundColor: session.studentID ? "#CB8A8A" : "#B9DFC1",
    };

    const finalDate = new Date(session.sessionDateStart)
    finalDate.setMinutes(finalDate.getMinutes() + session.sessionDateDuration_min)

    return (
        <div
            style={backgroundStyle}
            className='w-3/4 h-[50px] flex rounded-xl px-3'
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
            {session.pilotFirstName}
            {session.id}
        </div>
    )
}

export default SessionDisplay
