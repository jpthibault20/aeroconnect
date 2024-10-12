import React from 'react';
import { workingHour } from '@/config/configClub';
import { dayFr } from '@/config/date';
import { getDaysOfWeek } from '@/api/date';
import Session from './Session';
import { flightsSessionsExemple } from "@/config/exempleData"

interface props {
    className?: string;
    date: Date;
}
const TabCalendar = ({ date }: props) => {
    const daysOfWeek = getDaysOfWeek(date);
    console.log(flightsSessionsExemple);

    const formatTime = (numberValue: number) => {
        // Sépare la partie entière et la partie décimale
        const [hours, minutes] = numberValue.toString().split('.');

        // Convertir l'heure en format hh (si c'est un seul chiffre, ajouter un 0 devant)
        const formattedHours = hours.padStart(2, '0');

        // Si la partie décimale existe, on la garde telle quelle, sinon on utilise '00'
        const formattedMinutes = minutes ? minutes.padEnd(2, '0') : '00';

        // Retourne l'heure au format hh:mm
        return `${formattedHours}:${formattedMinutes}`;
    };

    return (
        <div className="w-full h-full">
            <div className="table w-full h-full table-fixed">
                <div className="table-header-group">
                    <div className="table-row">
                        {/* Première colonne avec largeur fixe */}
                        <div className="table-cell w-20" />
                        {daysOfWeek.map((item, index) => (
                            <div className="table-cell p-1" key={index}>
                                <div
                                    className={`font-bold text-center rounded-md ${item.isToday ? 'bg-[#373573]' : ''}`}
                                >
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
                <div className="table-row-group h-full bg-[#E4E7ED]">
                    {workingHour.map((hour, index) => (
                        <div key={index} className="table-row">
                            {/* Première colonne avec largeur fixe */}
                            <div
                                className={`table-cell pl-3 text-center font-istok font-semibold text-[#646464] align-middle ${index === 0 ? 'border-t-2 border-[#A5A5A5]' : ''} w-20`}
                            >
                                {formatTime(hour)}
                            </div>
                            {dayFr.map((item, indexday) => (
                                <div
                                    className={`table-cell align-middle p-1 border-b border-[#C1C1C1] ${index === 0 ? 'border-t-2 border-[#A5A5A5]' : ''}`}
                                    key={indexday}
                                >
                                    <Session
                                        indexX={index}
                                        indexY={indexday}
                                        tabDays={dayFr}
                                        tabHours={workingHour}
                                        events={flightsSessionsExemple}
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
}

export default TabCalendar;
