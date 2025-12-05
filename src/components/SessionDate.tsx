import React from 'react';
import { ArrowRight, Clock } from 'lucide-react';

interface SessionDateProps {
    startDate: Date;
    endDate: Date;
}

const SessionDate = ({ startDate, endDate }: SessionDateProps) => {
    // Fonction locale pour formater l'heure proprement (HH:MM)
    // Cela évite d'importer une fonction externe et garantit le formatage 24h
    const formatTime = (date: Date) => {
        return new Date(date).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="flex items-center gap-4 pb-4 w-full">
            {/* Début */}
            <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Début
                </label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                    <Clock className="w-4 h-4 text-[#774BBE]" />
                    <span>{formatTime(startDate)}</span>
                </div>
            </div>

            {/* Séparateur */}
            <div className="flex items-center justify-center pt-5">
                <ArrowRight className="w-4 h-4 text-slate-300" />
            </div>

            {/* Fin */}
            <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Fin
                </label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{formatTime(endDate)}</span>
                </div>
            </div>
        </div>
    );
};

export default SessionDate;