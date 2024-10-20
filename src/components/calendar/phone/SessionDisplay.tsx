import { FLIGHT_SESSION } from '@prisma/client'
import React from 'react'

interface props {
    session: FLIGHT_SESSION[]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SessionDisplay = ({ session }: props) => {

    // console.log(session)

    // const backgroundStyle = {
    //     backgroundColor: session.studentID ? "#CB8A8A" : "#B9DFC1",
    // };

    // const finalDate = new Date(session[0].sessionDateStart)
    // finalDate.setMinutes(finalDate.getMinutes() + session[0].sessionDateDuration_min)

    return (
        <div
            // style={backgroundStyle}
            className='w-3/4 h-[50px] flex rounded-xl px-3'
        >
            {/* <div className='text-xs textb-[#646464] flex flex-col justify-center items-center'>
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
            {session.pilotFirstName} */}
        </div>
    )
}

export default SessionDisplay
