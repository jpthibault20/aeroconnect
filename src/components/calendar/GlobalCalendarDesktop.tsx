/**
 * @file GlobalCalendarDesktop.tsx
 * @brief Composant principal du calendrier pour la vue Desktop (Refondu UI/UX).
 */
import React, { useState, useMemo } from 'react'
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

const GlobalCalendarDesktop = ({ sessions, setSessions, planesProp, usersProps }: Props) => {
    const { currentUser } = useCurrentUser()
    const { currentClub } = useCurrentClub();
    const [date, setDate] = useState(new Date());
    const [sessionsFlitered, setSessionsFiltered] = useState<flight_sessions[]>(sessions);

    // Optimisation avec useMemo
    const filterdPlanes = useMemo(() =>
        planesProp.filter((p) => currentUser?.classes.includes(p.classes)),
        [planesProp, currentUser]);

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

    return (
        <div className='hidden lg:flex flex-col h-full bg-slate-50/50 w-full'>

            {/* --- HEADER & TOOLBAR --- */}
            <header className="flex-none px-6 py-5 flex items-center justify-between gap-4 border-b border-slate-200/50 bg-white/50 backdrop-blur-sm sticky top-0 z-10">

                {/* Gauche: Titre & Navigation Date */}
                <div className="flex items-center gap-6">
                    <h1 className="text-3xl font-bold text-slate-800 capitalize flex items-baseline gap-2 min-w-fit">
                        {monthFr[date.getMonth()]}
                        <span className="text-slate-400 font-light text-2xl">{date.getFullYear()}</span>
                    </h1>

                    {/* Séparateur visuel */}
                    <div className="h-8 w-px bg-slate-200 hidden xl:block" />

                    <DaySelector
                        className="flex items-center"
                        onClickNextWeek={onClickNextweek}
                        onClickPreviousWeek={onClickPreviousWeek}
                        onClickToday={onClickToday}
                    />
                </div>

                {/* Droite: Actions */}
                <div className='flex items-center gap-3'>
                    {/* Groupe d'outils secondaires (Unifié visuellement) */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                        <Export usersProps={usersProps} flightsSessions={sessions} planes={planesProp} />

                        <div className="w-px h-5 bg-slate-100 mx-1" />

                        <Filter
                            sessions={sessions}
                            setSessionsFiltered={setSessionsFiltered}
                            display='desktop'
                            usersProps={usersProps}
                            planesProp={filterdPlanes}
                        />

                        {/* On affiche DeleteManySessions seulement si nécessaire, mais supposons qu'il gère sa propre visibilité ou est toujours là */}
                        <div className="w-px h-5 bg-slate-100 mx-1" />

                        <DeleteManySessions usersProps={usersProps} sessionsProps={sessions} setSessions={setSessions} />
                    </div>

                    {/* Action Principale */}
                    <div className="shadow-sm shadow-purple-200 rounded-lg">
                        <NewSession
                            display='desktop'
                            setSessions={setSessions}
                            planesProp={filterdPlanes}
                            usersProps={usersProps}
                        />
                    </div>
                </div>
            </header>

            {/* --- CALENDAR CONTENT --- */}
            <main className='flex-1 overflow-hidden'>
                {/* Le calendrier prend tout l'espace restant */}
                <TabCalendar
                    date={date}
                    sessions={sessionsFlitered}
                    setSessions={setSessions}
                    clubHours={clubHours}
                    usersProps={usersProps}
                    planesProp={planesProp}
                />
            </main>
        </div>
    )
}

export default GlobalCalendarDesktop