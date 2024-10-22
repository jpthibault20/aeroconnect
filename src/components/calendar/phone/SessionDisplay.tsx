import { FLIGHT_SESSION } from '@prisma/client'
import React, { } from 'react'
import { formatPilotName } from '@/api/global function/formatPilotName'

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
            className={`w-3/4 h-[50px] flex rounded-xl px-3 ${session.studentID ? 'opacity-60' : ''} `}
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
                        {session.planeName}
                    </p>
                </div>
            )}

        </div>
    )
}

export default SessionDisplay
