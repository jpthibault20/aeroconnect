/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useMemo, useState } from 'react';
import { dayFr } from '@/config/config';
import { formatTime, getDaysOfWeek, getSessionsFromDate } from '@/api/date';
import { flight_sessions, planes, User } from '@prisma/client';
import Session from './Session';
import { cn } from '@/lib/utils'; // Utilisation de cn pour les classes conditionnelles si dispo

interface Props {
    className?: string;
    date: Date;
    sessions: flight_sessions[];
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    clubHours: number[];
    usersProps: User[]
    planesProp: planes[]
}

const TabCalendar = ({ date, sessions, setSessions, clubHours, usersProps, planesProp }: Props) => {
    const [year, setYear] = useState(date.getFullYear());

    // Récupère les jours de la semaine
    const daysOfWeek = useMemo(() => getDaysOfWeek(date), [date]);

    const hours = clubHours.slice(0, clubHours.length - 1);

    const getSessions = (indexX: number, indexY: number) => {
        const hour = clubHours[indexX] !== undefined ? Math.floor(clubHours[indexX]) : 0;
        const minutes = clubHours[indexX] !== undefined ? Math.round((clubHours[indexX] % 1) * 60) : 0;

        if (daysOfWeek[indexY]?.month === 11 && daysOfWeek[indexY]?.dayNumber === 31 && year === date.getFullYear()) {
            setYear(year + 1);
        }

        const sessionDate = new Date(
            daysOfWeek[indexY]?.year ?? 0,
            daysOfWeek[indexY]?.month ?? 0,
            daysOfWeek[indexY]?.dayNumber ?? 1,
            hour,
            minutes,
            0
        );
        return getSessionsFromDate(sessionDate, sessions); // Filtre les sessions pertinentes
    };

    return (
        <div className="w-full h-full overflow-hidden flex flex-col bg-white shadow-sm rounded-lg border border-slate-200">
            {/* Utilisation de div flex/grid ou table CSS pour un meilleur contrôle du responsive si besoin. 
                Ici on garde la structure table pour la compatibilité avec ta logique existante */}
            <div className="table w-full h-full table-fixed border-collapse">

                {/* En-tête avec les jours de la semaine */}
                <div className="table-header-group">
                    <div className="table-row">
                        {/* Cellule vide coin haut gauche */}
                        <div className="table-cell w-20 bg-slate-50 border-b border-r border-slate-200" />

                        {daysOfWeek.map((item, index) => (
                            <div className="table-cell p-2 align-top border-b border-slate-200 bg-slate-50" key={index}>
                                <div className={cn(
                                    "flex flex-col items-center justify-center py-2 rounded-lg transition-colors",
                                    item.isToday ? "bg-[#774BBE] text-white shadow-md" : "text-slate-600"
                                )}>
                                    <p className={cn("font-medium text-sm uppercase tracking-wide", item.isToday ? "text-white/90" : "text-slate-500")}>
                                        {item.dayName}
                                    </p>
                                    <p className="font-bold text-2xl">
                                        {item.dayNumber}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Créneaux horaires */}
                <div className="table-row-group bg-slate-50/50">
                    {hours.map((hour, index) => (
                        <div key={index} className="table-row">
                            {/* Colonne Heure */}
                            <div className="table-cell w-20 align-middle text-center border-r border-slate-200 border-b border-slate-200/50">
                                <span className="text-xs font-semibold text-slate-400 relative -top-3 bg-white px-1 rounded">
                                    {formatTime(hour)}
                                </span>
                            </div>

                            {/* Cellules Calendrier */}
                            {dayFr.map((item, indexday) => {
                                const slotSessions = getSessions(index, indexday);
                                return (
                                    <div
                                        className="table-cell p-1 border-b border-r border-slate-200 relative h-24 transition-colors hover:bg-slate-100/50"
                                        key={indexday}
                                    >
                                        {slotSessions?.length > 0 && (
                                            <Session
                                                sessions={slotSessions}
                                                setSessions={setSessions}
                                                usersProps={usersProps}
                                                planesProp={planesProp}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TabCalendar;