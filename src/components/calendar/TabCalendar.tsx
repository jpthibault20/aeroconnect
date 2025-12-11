/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useMemo, useState } from 'react';
import { dayFr } from '@/config/config';
import { formatTime, getDaysOfWeek, getSessionsFromDate } from '@/api/date';
import { flight_sessions, planes, User } from '@prisma/client';
import Session from './Session';
import { cn } from '@/lib/utils';

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
        return getSessionsFromDate(sessionDate, sessions);
    };

    return (
        // Conteneur principal : Flex column + Bordure plus contrastée (slate-300)
        <div className="w-full h-full flex flex-col bg-white shadow-sm rounded-lg border border-slate-300 overflow-hidden">

            {/* Zone Scrollable : prend tout l'espace restant */}
            <div className="flex-1 overflow-y-auto relative">

                {/* Structure Table : 
                    Ajout de 'min-h-full' pour forcer la table à prendre toute la hauteur disponible 
                    et éviter l'espace blanc en bas si le contenu est court.
                */}
                <div className="table w-full min-h-full table-fixed border-collapse">

                    {/* En-tête Sticky : Reste accroché en haut lors du scroll */}
                    <div className="table-header-group sticky top-0 z-20 shadow-sm">
                        <div className="table-row">
                            {/* Cellule Coin vide (haut gauche) */}
                            <div className="table-cell w-20 bg-slate-100 border-b border-r border-slate-300" />

                            {/* Jours de la semaine */}
                            {daysOfWeek.map((item, index) => (
                                <div className="table-cell p-2 align-top border-b border-r border-slate-300 bg-slate-100 last:border-r-0" key={index}>
                                    <div className={cn(
                                        "flex flex-col items-center justify-center py-2 rounded-lg transition-colors border",
                                        item.isToday
                                            ? "bg-[#774BBE] border-[#774BBE] text-white shadow-md"
                                            : "bg-white border-transparent text-slate-700"
                                    )}>
                                        <p className={cn("font-bold text-sm uppercase tracking-wider", item.isToday ? "text-white/90" : "text-slate-500")}>
                                            {item.dayName}
                                        </p>
                                        <p className="font-extrabold text-2xl">
                                            {item.dayNumber}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Corps du calendrier */}
                    <div className="table-row-group bg-white">
                        {hours.map((hour, index) => {
                            // Pré-calculer les sessions pour toute la ligne
                            const rowSessions = dayFr.map((_, indexday) => getSessions(index, indexday));

                            // Vérifier s'il y a au moins une session dans cette ligne
                            const hasSessionsInRow = rowSessions.some(sessions => sessions.length > 0);

                            // Hauteur dynamique : h-28 si contenu, h-14 si vide.
                            // Note : Avec min-h-full sur la table, ces hauteurs agiront comme des minimums, 
                            // et les lignes s'étireront si nécessaire pour remplir l'écran.
                            const rowHeightClass = hasSessionsInRow ? "h-20" : "h-14";

                            return (
                                <div key={index} className="table-row">
                                    {/* Colonne Heure */}
                                    <div className="table-cell w-20 align-middle text-center border-r border-slate-300 border-b border-slate-300/60 bg-slate-50">
                                        <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm relative -top-3">
                                            {formatTime(hour)}
                                        </span>
                                    </div>

                                    {/* Cellules Grille */}
                                    {dayFr.map((item, indexday) => {
                                        const slotSessions = rowSessions[indexday];

                                        return (
                                            <div
                                                className={cn(
                                                    "table-cell p-1 border-b border-r border-slate-300/60 relative transition-all duration-200 hover:bg-slate-50 last:border-r-0",
                                                    rowHeightClass
                                                )}
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
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TabCalendar;