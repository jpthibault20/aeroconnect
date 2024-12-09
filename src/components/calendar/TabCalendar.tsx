import React, { useMemo } from 'react';
import { dayFr } from '@/config/date';
import { formatTime, getDaysOfWeek, getSessionsFromDate } from '@/api/date';
import { Club, flight_sessions } from '@prisma/client';
import Session from './Session';

interface Props {
    className?: string;
    date: Date;
    sessions: flight_sessions[];
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    club: Club | undefined;
}

const TabCalendar = ({ date, sessions, setSessions, club }: Props) => {
    // Récupère les jours de la semaine
    const daysOfWeek = useMemo(() => getDaysOfWeek(date), [date]);

    const getSessions = (indexX: number, indexY: number) => {
        const hour = club?.HoursOn[indexX] !== undefined ? Math.floor(club?.HoursOn[indexX]) : 0;
        const minutes = club?.HoursOn[indexX] !== undefined ? Math.round((club?.HoursOn[indexX] % 1) * 60) : 0;

        const sessionDate = new Date(
            date.getFullYear(),
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
                <div className="table-row-group h-full bg-[#E4E7ED]">
                    {club?.HoursOn.map((hour, index) => (
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
