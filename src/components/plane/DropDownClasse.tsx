import React, { useEffect, useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ChevronDown, Check } from 'lucide-react';
import { aircraftClasses } from '@/config/config';
import { planes } from '@prisma/client';
import { useCurrentClub } from '@/app/context/useCurrentClub';
import { cn } from '@/lib/utils';

interface Props {
    planeProp: planes;
    setPlaneProp: React.Dispatch<React.SetStateAction<planes>>;
}

export const DropDownClasse = ({ planeProp, setPlaneProp }: Props) => {
    const { currentClub } = useCurrentClub();

    // Filtrer les classes disponibles selon le club
    const [classesList, setClassesList] = useState(
        aircraftClasses.filter(c => currentClub?.classes.includes(c.id))
    );

    useEffect(() => {
        setClassesList(
            aircraftClasses.filter(c => currentClub?.classes.includes(c.id))
        );
    }, [currentClub]);

    // Trouver le label actuel pour l'afficher
    const currentLabel = classesList.find(c => c.id === planeProp.classes)?.label || "Sélectionner une classe";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className={cn(
                "w-full flex justify-between items-center text-left",
                "bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm", // Style Input standard
                "focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent", // Focus neutre
                "transition-all hover:bg-slate-100"
            )}>
                <span className="text-slate-900 truncate">
                    {currentLabel}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400 opacity-50" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] bg-white border-slate-200 shadow-lg rounded-lg p-1">
                {classesList.length > 0 ? (
                    classesList.map(aircraftClass => {
                        const isSelected = planeProp.classes === aircraftClass.id;
                        return (
                            <DropdownMenuItem
                                key={aircraftClass.id}
                                onClick={() =>
                                    setPlaneProp(prev => ({
                                        ...prev,
                                        classes: aircraftClass.id,
                                    }))
                                }
                                className={cn(
                                    "flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer",
                                    isSelected ? "bg-slate-100 font-medium text-slate-900" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                {aircraftClass.label}
                                {isSelected && <Check className="h-4 w-4 text-slate-500" />}
                            </DropdownMenuItem>
                        );
                    })
                ) : (
                    <div className="p-3 text-sm text-slate-400 text-center italic">
                        Aucune classe configurée pour ce club.
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};