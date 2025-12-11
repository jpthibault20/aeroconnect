/**
 * @file DaySelector.tsx
 * @brief Composant de navigation temporelle (Semaine précédente / Aujourd'hui / Semaine suivante).
 * * Refonte UI : Style "Capsule" unifié pour une meilleure intégration dans la toolbar.
 */

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import React from 'react'
import { Button } from '../ui/button';
import { cn } from '@/lib/utils'; // Utilisation de cn pour fusionner les classes proprement

interface props {
    className?: string;
    onClickNextWeek?: () => void;
    onClickPreviousWeek?: () => void;
    onClickToday?: () => void;
}

/**
 * @function DaySelector
 */
const DaySelector = ({ className, onClickNextWeek, onClickPreviousWeek, onClickToday }: props) => {
    return (
        <div className={cn(
            "flex items-center gap-0.5 p-1 bg-white border border-slate-200 rounded-lg shadow-sm",
            className
        )}>
            {/* Bouton Précédent */}
            <Button
                variant="ghost"
                size="icon"
                onClick={onClickPreviousWeek}
                className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                aria-label="Semaine précédente"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Séparateur vertical subtil */}
            <div className="w-px h-4 bg-slate-200 mx-1" />

            {/* Bouton Aujourd'hui */}
            <Button
                variant="ghost"
                size="sm"
                onClick={onClickToday}
                className="h-8 px-3 text-xs font-medium text-slate-600 hover:text-[#774BBE] hover:bg-purple-50 rounded-md transition-all flex items-center gap-2"
            >
                <Calendar className="w-3.5 h-3.5" />
                <span>Aujourd&apos;hui</span>
            </Button>

            {/* Séparateur vertical subtil */}
            <div className="w-px h-4 bg-slate-200 mx-1" />

            {/* Bouton Suivant */}
            <Button
                variant="ghost"
                size="icon"
                onClick={onClickNextWeek}
                className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                aria-label="Semaine suivante"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    )
}

export default DaySelector