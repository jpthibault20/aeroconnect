import React from 'react';
import { workingHour } from '@/config/configClub'; // Assure-toi que `workingHour` est bien importé depuis ta config
import { dayFr } from '@/config/date';
import { formatTime, getDaysOfWeek } from '@/api/date';
import Session from './Session';
import { flight_sessions } from '@prisma/client';

interface Props {
    className?: string;
    date: Date;
    sessions: flight_sessions[];
}

const TabCalendar = ({ date, sessions }: Props) => {
    // Récupère les jours de la semaine
    const daysOfWeek = getDaysOfWeek(date);

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
                            {dayFr.map((item, indexday) => (
                                <div
                                    className={`table-cell p-1 border-b border-[#C1C1C1] ${index === 0 ? 'border-t-2 border-[#A5A5A5]' : ''}`}
                                    key={indexday}
                                >
                                    <Session
                                        indexX={index}
                                        indexY={indexday}
                                        tabDays={dayFr}
                                        tabHours={workingHour}
                                        events={sessions}
                                        date={date}
                                    />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TabCalendar;
