
import React, { use, useEffect, useState } from 'react'
import InitialLoading from '../InitialLoading'
import DaySelector from './DaySelector'
import { Settings2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import CalendarFilter from './CalendarFilter'
import { flightsSessionsExemple } from '@/config/exempleData'
import { Label } from '../ui/label'
import Filter from './phone/Filter'
import { DaysOfMonthType, getCompleteWeeks, getFlightSessionsForDay } from '@/api/date'
import Calendar from './phone/calendar'
import SessionOfDay from "@/components/calendar/phone/SessionsOfDay"
import { FLIGHT_SESSION } from '@prisma/client'



const GlobalCalendarPhone = () => {
    const [date, setDate] = useState(new Date())
    const [instructor, setInstructor] = useState("")
    const [plane, setPlane] = useState("")
    const [daysOfMonth, setDaysOfMonth] = useState<DaysOfMonthType>()
    const [sessionOfSelectedDay, setSessionOfSelectedDay] = useState<FLIGHT_SESSION[]>()
    const [selectDate, setSelectDate] = useState(new Date)

    useEffect(() => {
        setSessionOfSelectedDay(getFlightSessionsForDay(selectDate, flightsSessionsExemple))
    }, [selectDate])

    useEffect(() => {
        try {
            const res = getCompleteWeeks(date)
            setDaysOfMonth(res)
        } catch (error) {
            console.log(error)
        }
    }, [date])

    /**
    * 
    * @param prevDate 
    * 
    * Permet de changer la semaine afficher du calendrier
    */
    const onClickNextweek = () => {
        console.log('Next day')
        setDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setMonth(newDate.getMonth() + 1);
            return newDate;
        });
    }

    /**
     * 
     * @param prevDate
     * 
     * Permet de changer la semaine afficher du calendrier
     */
    const onClickPreviousWeek = () => {
        console.log('Previous day')
        setDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setMonth(newDate.getMonth() - 1);
            return newDate;
        });
    }

    /**
     * 
     * @param today
     * 
     * Permet de de revenir a la semaine courante
     */
    const onClickToday = () => {
        console.log('Today')
        setDate(new Date())
    }



    return (
        <InitialLoading className='xl:hidden flex flex-col justify-center items-center h-full'>
            <p className='text-2xl font-istok font-semibold my-3'>Calendrier</p>
            <div className='w-full px-6'>
                <div className='border-b border-[#646464] w-full' />
            </div>
            <div className='w-full mt-6'>
                <p className='text-4xl font-istok pl-6 mb-3'>
                    {date.toLocaleDateString('fr-FR', { month: 'long' })}, {date.toLocaleDateString('fr-FR', { year: 'numeric' })}
                </p>
                <div className='flex w-full px-6'>
                    <DaySelector
                        className='w-full flex'
                        onClickNextWeek={onClickNextweek}
                        onClickPreviousWeek={onClickPreviousWeek}
                        onClickToday={onClickToday}
                    />
                    <Filter
                        setInstructor={setInstructor}
                        setPlane={setPlane}
                    />
                </div>
            </div>

            <Calendar daysOfMonth={daysOfMonth} date={date} flightsSessionsExemple={flightsSessionsExemple} setSelectDate={setSelectDate} selectDate={selectDate} />

            <div className='h-full  w-full bg-[#E4E7ED] border-t border-[#646464] mt-6'>
                <SessionOfDay sessionOfSelectedDay={sessionOfSelectedDay} selectDate={selectDate} />
            </div>

        </InitialLoading>
    )
}

export default GlobalCalendarPhone
