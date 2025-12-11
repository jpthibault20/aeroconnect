import React from 'react';
import { Button } from '../ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { userRole } from '@prisma/client';
import { ListFilter, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    roleFilter: userRole | 'all';
    handle: (value: userRole | 'all') => void;
}

// Configuration des labels pour éviter les répétitions
const roleOptions: { value: userRole | 'all'; label: string }[] = [
    { value: 'all', label: 'Tous les membres' },
    { value: 'OWNER', label: 'Président' },
    { value: 'INSTRUCTOR', label: 'Instructeur' },
    { value: 'PILOT', label: 'Pilote' },
    { value: 'STUDENT', label: 'Élève' },
    { value: 'USER', label: 'Visiteur' },
];

const Filter = ({ roleFilter, handle }: Props) => {

    // Trouver le label actif pour l'afficher dans le bouton
    const activeLabel = roleOptions.find(r => r.value === roleFilter)?.label;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full sm:w-[180px] justify-between bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                        roleFilter !== 'all' && "border-[#774BBE] text-[#774BBE] bg-purple-50 hover:bg-purple-100" // Style actif
                    )}
                >
                    <div className="flex items-center gap-2 truncate">
                        <ListFilter className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{activeLabel}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-[200px] p-1">
                {roleOptions.map((option, index) => {
                    const isSelected = roleFilter === option.value;

                    // Ajout d'un séparateur après "Tous les membres" pour la clarté
                    if (index === 1) {
                        return (
                            <React.Fragment key={option.value}>
                                <DropdownMenuSeparator className="my-1 bg-slate-100" />
                                <DropdownMenuItem
                                    onClick={() => handle(option.value)}
                                    className={cn(
                                        "flex items-center justify-between cursor-pointer px-3 py-2 rounded-md text-sm",
                                        isSelected ? "bg-purple-50 text-[#774BBE] font-medium" : "text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    {option.label}
                                    {isSelected && <Check className="h-4 w-4" />}
                                </DropdownMenuItem>
                            </React.Fragment>
                        );
                    }

                    return (
                        <DropdownMenuItem
                            key={option.value}
                            onClick={() => handle(option.value)}
                            className={cn(
                                "flex items-center justify-between cursor-pointer px-3 py-2 rounded-md text-sm",
                                isSelected ? "bg-purple-50 text-[#774BBE] font-medium" : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            {option.label}
                            {isSelected && <Check className="h-4 w-4" />}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default Filter;