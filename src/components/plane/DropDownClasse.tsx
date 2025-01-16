import React, { useEffect, useState } from 'react';
import { Label } from '../ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { aircraftClasses } from '@/config/config';
import { planes } from '@prisma/client';
import { useCurrentClub } from '@/app/context/useCurrentClub';

interface Props {
    planeProp: planes;
    setPlaneProp: React.Dispatch<React.SetStateAction<planes>>;
}

export const DropDownClasse = ({ planeProp, setPlaneProp }: Props) => {
    const { currentClub } = useCurrentClub();
    const [classesList, setClassesList] = useState(
        aircraftClasses.filter(c => currentClub?.classes.includes(c.id))
    );

    useEffect(() => {
        setClassesList(
            aircraftClasses.filter(c => currentClub?.classes.includes(c.id))
        );
    }, [currentClub]);

    return (
        <div>
            <Label>Classe de l&apos;avion</Label>
            <DropdownMenu>
                <DropdownMenuTrigger className="w-full flex justify-between items-center shadow-sm border border-gray-200 rounded-md px-3 py-2">
                    {classesList.find(c => c.id === planeProp.classes)?.label || "Classe ULM"}
                    <ChevronDown />
                </DropdownMenuTrigger>

                {/* ✅ Correction ici */}
                <DropdownMenuContent className="w-full min-w-[var(--radix-dropdown-menu-trigger-width)] shadow-md border border-gray-200 rounded-md">
                    {classesList.map(aircraftClass => (
                        <DropdownMenuItem
                            key={aircraftClass.id}
                            onClick={() =>
                                setPlaneProp(prev => ({
                                    ...prev,
                                    classes: aircraftClass.id,
                                }))
                            }
                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 transition-colors"
                        >
                            {aircraftClass.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};
