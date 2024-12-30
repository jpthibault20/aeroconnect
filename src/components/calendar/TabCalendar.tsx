/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useMemo, useState } from 'react';
import { dayFr } from '@/config/date';
import { formatTime, getDaysOfWeek, getSessionsFromDate } from '@/api/date';
import { flight_sessions, planes, User } from '@prisma/client';
import Session from './Session';

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
        <div className="w-full h-full ">
            <div className="table w-full h-full table-fixed">
                {/* En-tête avec les jours de la semaine */}
                <div className="table-header-group">
                    <div className="table-row">
                        <div className="table-cell w-20" />
                        {daysOfWeek.map((item, index) => (
                            <div className="table-cell p-1" key={index}>
                                <div className={`font-bold text-center rounded-md ${item.isToday ? 'bg-[#373573]' : ''}`}>
                                    <p className={`font-istok text-xl ${item.isToday ? 'text-white' : 'text-black'}`}>
                                        {item.dayName}
                                    </p>
                                    <p className={`font-istok font-semibold text-xl text-center ${item.isToday ? 'text-white' : 'text-black'}`}>
                                        {item.dayNumber}
                                    </p>
                                </div>
                                <div className="h-3" />
                            </div>
                        ))}
                    </div>
                </div>
                {/* Créneaux horaires */}
                <div className="table-row-group h-full bg-gray-100">
                    {hours.map((hour, index) => (
                        <div key={index} className="table-row">
                            <div className={`table-cell pl-3 text-center font-istok font-semibold text-[#646464] align-middle ${index === 0 ? 'border-t-2 border-[#A5A5A5]' : ''} w-20`}>
                                {formatTime(hour)}
                            </div>
                            {dayFr.map((item, indexday) => {
                                const slotSessions = getSessions(index, indexday);

                                return (
                                    <div
                                        className={`table-cell p-1 border-b border-[#C1C1C1] ${index === 0 ? 'border-t-2 border-[#A5A5A5]' : ''}`}
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
