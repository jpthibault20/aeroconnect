import React, { } from 'react'
import InitialLoading from '../InitialLoading'
import { monthFr } from '@/config/date';


const GlobalCalendarDesktop = () => {
    const date = new Date();

    return (
        <InitialLoading>
            <div className='h-full  border-4 border-black'>
                <div className=' w-full'>
                    <p className='text-4xl font-istok'>
                        {monthFr[date.getMonth()]}, {date.getFullYear()}
                    </p>
                </div>
                <div className='bg-[#E4E7ED] w-full  border-t-2 border-[#A5A5A5]'>
                </div>
            </div>

        </InitialLoading>
    )
}

export default GlobalCalendarDesktop
