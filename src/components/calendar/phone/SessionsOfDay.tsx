import { FLIGHT_SESSION } from '@prisma/client'
import React from 'react'
import SessionDisplay from './SessionDisplay'

interface props {
    sessionOfSelectedDay: FLIGHT_SESSION[] | undefined
    selectDate: Date
}

const SessionsOfDay = ({ sessionOfSelectedDay, selectDate }: props) => {

    return (
        <div className='h-full w-full'>
            <div className='w-full h-full'>
                <p className='font-istok text-2xl p-3'>
                    {selectDate.toLocaleDateString('fr-FR', { day: "2-digit", month: "long", year: "numeric" })}
                </p>
                <div className=' w-full space-y-6 flex flex-col items-center'>
                    {sessionOfSelectedDay?.map((session, index) => (
                        <SessionDisplay key={index} session={session} />
                    ))}

                    <div className='h-20' />

                </div>
            </div>

        </div>
    )
}

export default SessionsOfDay
