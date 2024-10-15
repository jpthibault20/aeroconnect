
import React, { useState } from 'react'
import InitialLoading from '../InitialLoading'
import DaySelector from './DaySelector'
import { Settings2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import CalendarFilter from './CalendarFilter'
import { instructorExemple, planeExemple } from '@/config/exempleData'
import { Label } from '../ui/label'
import Filter from './phone/Filter'


const GlobalCalendarPhone = () => {
    const [date, setDate] = useState(new Date())
    const [instructor, setInstructor] = useState("")
    const [plane, setPlane] = useState("")

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
        <InitialLoading className='xl:hidden flex flex-col justify-center items-center'>
            <p className='text-2xl font-istok font-semibold my-3'>Calendrier</p>
            <div className='w-full px-6'>
                <div className='border-b border-[#646464] w-full' />
            </div>
            <div className='w-full mt-6'>
                <p className='text-2xl font-istok pl-6'>
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
                    />
                </div>

            </div>
        </InitialLoading>
    )
}

export default GlobalCalendarPhone
