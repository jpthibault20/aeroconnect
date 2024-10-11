import React from 'react'
import { FLIGHT_SESSION } from '@prisma/client';
import { workingHour } from '@/config/configClub';
import { dayFr } from '@/config/date';

interface props {
    className?: string;
    flightsSessions: FLIGHT_SESSION[] | any;
}

const Calendar = ({ className, flightsSessions }: props) => {

    console.log(flightsSessions)
    return (
        <div className={`${className} flex flex-col justify-between h-full pl-6`}>
            {workingHour.map((hour) => (
                <div key={hour} className='h-full items-center flex '>
                    <p className='font-istok font-semibold text-[#646464]'>{hour}h</p>
                    <div className=' h-full w-full mx-8 border-b border-[#C1C1C1] flex  space-x-[4.3%]'>
                        {dayFr.map((item) => (
                            <div
                                key={item}
                                className='bg-green-500 rounded-md m-2 w-[10%]'
                            >
                                #
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>


    )
}


export default Calendar
