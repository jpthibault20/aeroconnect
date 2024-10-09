import React, { useEffect } from 'react'
import InitialLoading from '../InitialLoading'
// import { getDate } from '@/api/date'

const GlobalCalendarDesktop = () => {
    useEffect(() => {
        const date =  new Date();
        console.log(date)
        // const fetchDate = async () => {
        //     try {
        //         const res = await getDate();
        //         console.log(res)
        //     } catch (error) {
        //         console.log(error)
        //     }
        // }
        // fetchDate()

    }, [])
    return (
        <InitialLoading>
            <div className='hidden lg:flex flex-col justify-center items-center'>
                <p className='text-2xl font-istok'>Calendar desktop</p>
            </div>
        </InitialLoading>
    )
}

export default GlobalCalendarDesktop
