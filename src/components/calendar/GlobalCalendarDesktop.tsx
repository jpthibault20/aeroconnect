/**
 * @file GlobalCalendarDesktop.js
 * @brief This component renders the desktop version of the calendar with filters for instructors and planes.
 * 
 * The component includes logic for navigating through weeks, selecting the current day, and filtering by instructor and plane. 
 * It is optimized for larger screens (hidden on smaller screens) and provides a smooth user experience for scheduling sessions.
 */
import React, { useEffect, useState } from 'react'
import { monthFr } from '@/config/config';
import DaySelector from './DaySelector';
import TabCalendar from './TabCalendar';
import NewSession from "@/components/NewSession"
import Filter from './Filter';
import { flight_sessions, planes, User } from '@prisma/client';
import { defaultHours } from '@/config/config';
import { useCurrentClub } from '@/app/context/useCurrentClub';
import DeleteManySessions from '../DeleteManySessions';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import Export from './Export';

interface Props {
    sessions: flight_sessions[];
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    planesProp: planes[];
    usersProps: User[]
}

/**
 * @function GlobalCalendarDesktop
 * @brief Main desktop calendar component with navigation and filters.
 *
 * This component allows the user to navigate between weeks, select today's date, 
 * and filter calendar sessions by instructor and plane. It renders the calendar 
 * within a desktop-only layout, hidden on mobile devices.
 * 
 */
const GlobalCalendarDesktop = ({ sessions, setSessions, planesProp, usersProps }: Props) => {
    const { currentUser } = useCurrentUser()
    const { currentClub } = useCurrentClub();
    const [date, setDate] = useState(new Date());
    const [sessionsFlitered, setSessionsFiltered] = useState<flight_sessions[]>(sessions);
    const filterdPlanes = planesProp.filter((p) => currentUser?.classes.includes(p.classes))


    const onClickNextweek = () => {
        setDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setDate(newDate.getDate() + 7);
            return newDate;
        });
    }

    const onClickPreviousWeek = () => {
        setDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setDate(newDate.getDate() - 7);
            return newDate;
        });
    }

    const onClickToday = () => {
        setDate(new Date())
    }

    const clubHours = currentClub?.HoursOn || defaultHours;

    // Effect pour récupérer les jours de la semaine
    useEffect(() => {
        const newDate = new Date(date); // Crée une copie de la date donnée

        // On récupère le jour de la semaine (0 = dimanche, 1 = lundi, ..., 6 = samedi)
        const dayOfWeek = newDate.getDay();

        // Si le jour est dimanche (0), on doit reculer d'un jour pour commencer la semaine le lundi
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

        // Calculer le premier jour de la semaine (lundi)
        const startOfWeek = new Date(newDate);
        startOfWeek.setDate(newDate.getDate() + diffToMonday);

        // Calculer le dernier jour de la semaine (dimanche)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date]);

    return (
        // Only rendered on large screens (hidden on smaller screens), includes a loading state.
        <div className='hidden lg:block h-full'>
            <div className="flex flex-col h-full overflow-y-auto">
                <div className="w-full flex items-center my-6">
                    {/* Displays the current month and year at the top of the calendar. */}
                    <p className="text-5xl font-istok pl-3 w-[400px]">
                        {monthFr[date.getMonth()]}, {date.getFullYear()}
                    </p>
                    <div className='flex-1'>
                        <div className='w-full flex justify-between items-end pl-6'>
                            {/* Day selector component allowing navigation between weeks. */}
                            <DaySelector
                                className="h-full flex items-end"
                                onClickNextWeek={onClickNextweek}
                                onClickPreviousWeek={onClickPreviousWeek}
                                onClickToday={onClickToday}
                            />
                            <div className='flex space-x-2 px-3 '>
                                <Export usersProps={usersProps} flightsSessions={sessions} planes={planesProp} />
                                <DeleteManySessions usersProps={usersProps} sessionsProps={sessions} setSessions={setSessions} />
                                <div>
                                    <NewSession
                                        display='desktop'
                                        setSessions={setSessions}
                                        planesProp={filterdPlanes}
                                        usersProps={usersProps}
                                />
                                </div>
                                <Filter
                                    sessions={sessions}
                                    setSessionsFiltered={setSessionsFiltered}
                                    display='desktop'
                                    usersProps={usersProps}
                                    planesProp={filterdPlanes}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className='h-full'>
                    <TabCalendar
                        date={date}
                        sessions={sessionsFlitered}
                        setSessions={setSessions}
                        clubHours={clubHours}
                        usersProps={usersProps}
                        planesProp={planesProp}
                    />
                </div>
            </div>
        </div>
    )
}

export default GlobalCalendarDesktop
