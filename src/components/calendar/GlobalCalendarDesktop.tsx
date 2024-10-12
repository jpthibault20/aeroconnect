import React, { useState } from 'react'
import InitialLoading from '../InitialLoading'
import { monthFr } from '@/config/date';
import DaySelector from './DaySelector';
import CalendarFilter from './CalendarFilter';
import { instructorExemple, planeExemple } from '@/config/exempleData';
import TabCalendar from './TabCalendar';


const GlobalCalendarDesktop = () => {
    const [date, setDate] = useState(new Date());
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [instructor, setInstructor] = useState("")
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [plane, setPlane] = useState("")

    const onClickNextweek = () => {
        console.log('Next day')
        setDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setDate(newDate.getDate() + 7);
            return newDate;
        });
    }

    const onClickPreviousWeek = () => {
        console.log('Previous day')
        setDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setDate(newDate.getDate() - 7);
            return newDate;
        });
    }

    const onClickToday = () => {
        console.log('Today')
        setDate(new Date())
    }

    return (
        <InitialLoading className='hidden xl:block h-full'>
            {/* Conteneur parent en Flexbox */}
            <div className="flex flex-col h-full">

                <div className="w-full flex items-center my-6">
                    <p className="text-5xl font-istok pl-3 w-3/12">
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
                    <TabCalendar date={date} />
                </div>
            </div>
        </InitialLoading>
    )
}

export default GlobalCalendarDesktop
