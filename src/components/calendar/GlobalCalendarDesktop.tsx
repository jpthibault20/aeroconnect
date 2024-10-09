import React, { useEffect } from 'react'
import InitialLoading from '../InitialLoading'
import { getDate } from '@/api/date'

const GlobalCalendarDesktop = () => {
    useEffect(() => {
        const date = new Date();
        console.log("client date : ", date)

        const fetchDate = async () => {
            try {
                const res = await getDate();
                const formattedDate = new Intl.DateTimeFormat('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZoneName: 'short',
                }).format(res.currentDate);
                
                console.log("server date : ", formattedDate)
            } catch (error) {
                console.log(error)
            }
        }
        fetchDate()

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
