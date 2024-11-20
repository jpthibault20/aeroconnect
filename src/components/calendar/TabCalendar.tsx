import React, { useMemo } from 'react';
import { workingHour } from '@/config/configClub';
import { dayFr } from '@/config/date';
import { formatTime, getDaysOfWeek, getSessionsFromDate } from '@/api/date';
import { flight_sessions } from '@prisma/client';
import Session from './Session';

interface Props {
    className?: string;
    date: Date;
    sessions: flight_sessions[];
    setReload: React.Dispatch<React.SetStateAction<boolean>>;
    reload: boolean;
}

const TabCalendar = ({ date, sessions, setReload, reload }: Props) => {
    console.log("TabCalendar | Rendering...");
    // Récupère les jours de la semaine
    const daysOfWeek = useMemo(() => getDaysOfWeek(date), [date]);

    // Fonction pour obtenir les sessions pour un créneau donné
    const getSessions = (indexX: number, indexY: number) => {
        const hour = workingHour[indexX] !== undefined ? Math.floor(workingHour[indexX]) : 0;
        const minutes = workingHour[indexX] !== undefined ? Math.round((workingHour[indexX] % 1) * 60) : 0;

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
        <div className="w-full h-full">
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
                    {workingHour.map((hour, index) => (
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
                                        {slotSessions.length > 0 && (
                                            <Session
                                                sessions={slotSessions}
                                                setReload={setReload}
                                                reload={reload}
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
