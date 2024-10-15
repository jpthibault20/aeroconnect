import React, { useEffect, useState } from 'react'
import InitialLoading from '../InitialLoading'
import { monthFr } from '@/config/date';
import DaySelector from './DaySelector';
import CalendarFilter from './CalendarFilter';
import { instructorExemple, planeExemple } from '@/config/exempleData';
import TabCalendar from './TabCalendar';


const GlobalCalendarDesktop = () => {
    const [date, setDate] = useState(new Date());
    const [instructor, setInstructor] = useState("")
    const [plane, setPlane] = useState("")

    // On supprime le filtre si le champ correspond à un carachtère vide " "
    useEffect(() => {
        if (instructor === ' ') setInstructor('')
        if (plane === ' ') setPlane('')
    }, [instructor, plane])

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
            newDate.setDate(newDate.getDate() + 7);
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
            newDate.setDate(newDate.getDate() - 7);
            return newDate;
        });
    }

    /**
     * 
     * @param 
     * 
     * Permet de de revenir a la semaine courante
     */
    const onClickToday = () => {
        console.log('Today')
        setDate(new Date())
    }

    return (
        <InitialLoading className='hidden xl:block h-full'>
            {/* Conteneur parent en Flexbox */}
            <div className="flex flex-col h-full overflow-y-auto">

                <div className="w-full flex items-center my-6">
                    <p className="text-5xl font-istok pl-3">
                        {monthFr[date.getMonth()]}, {date.getFullYear()}
                    </p>
                    <div className='flex-1'>
                        <div className=' w-full flex justify-between items-end pl-6'>
                            <DaySelector
                                className="h-full flex items-end"
                                onClickNextWeek={onClickNextweek}
                                onClickPreviousWeek={onClickPreviousWeek}
                                onClickToday={onClickToday}
                            />
                            <div className='flex space-x-2'>
                                <CalendarFilter
                                    className='h-full flex items-end justify-end'
                                    placeholder='Instructeur'
                                    liste={instructorExemple}
                                    onValueChange={setInstructor}
                                />
                                <CalendarFilter
                                    className='h-full flex items-end justify-end pr-6'
                                    placeholder='aéronef'
                                    liste={planeExemple}
                                    onValueChange={setPlane}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Deuxième div : prendra le reste de la hauteur disponible */}
                <div className='h-full'>
                    <TabCalendar
                        date={date}
                        instructorFilter={instructor}
                        planeFilter={plane}
                    />
                </div>
            </div>
        </InitialLoading>
    )
}

export default GlobalCalendarDesktop
