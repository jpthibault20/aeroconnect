import React from 'react';
import { Calendar } from 'lucide-react';

interface SessionHeaderProps {
    sessionStartDate: Date;
}

const SessionHeader = ({ sessionStartDate }: SessionHeaderProps) => {
    // Formatage natif pour avoir "Lundi 14 octobre 2023"
    const dateObj = new Date(sessionStartDate);
    const dateString = dateObj.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // Capitalisation de la première lettre (ex: "lundi" -> "Lundi")
    const formattedDate = dateString.charAt(0).toUpperCase() + dateString.slice(1);

    return (
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-100 shadow-sm w-full">
            {/* Icône Date */}
            <div className="p-2 bg-[#774BBE]/10 rounded-md flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-[#774BBE]" />
            </div>

            {/* Texte Date */}
            <div className="flex flex-col justify-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                    Date de la session
                </span>
                <span className="text-sm font-semibold text-slate-800 leading-tight">
                    {formattedDate}
                </span>
            </div>
        </div>
    );
};

export default SessionHeader;