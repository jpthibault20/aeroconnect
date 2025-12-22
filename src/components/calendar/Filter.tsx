import { flight_sessions, planes, User, userRole, NatureOfTheft } from '@prisma/client'
import React, { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Button } from '../ui/button'
import { cn } from '@/lib/utils'
import { flightNatures } from '@/config/config' // Ton fichier de config

// Icons
import {
    ListFilter, // Icone principale pour le bouton
    User as UserIcon,
    Plane,
    Tag,
    X,
    CheckCircle2
} from 'lucide-react'

interface Props {
    sessions: flight_sessions[],
    // On garde la prop display pour la compatibilité, mais on unifie le design
    display?: "desktop" | "phone"
    setSessionsFiltered: React.Dispatch<React.SetStateAction<flight_sessions[]>>
    planesProp: planes[]
    usersProps: User[]
}

const Filter = ({ sessions, setSessionsFiltered, planesProp, usersProps }: Props) => {
    const [plane, setPlane] = useState("all")
    const [instructor, setInstructor] = useState("all")
    const [nature, setNature] = useState("all")
    const [open, setOpen] = useState(false) // Pour gérer l'ouverture du popover

    const instructors = usersProps.filter((instructor) => instructor.role === userRole.INSTRUCTOR || instructor.role === userRole.OWNER);

    // --- LOGIQUE DE FILTRAGE ---
    useEffect(() => {
        const filteredSessions = sessions?.filter(session => {
            const instructorMatch = instructor === "all" || session.pilotID === instructor;
            const planeMatch = plane === "all" || session.planeID.includes(plane);
            const natureMatch = nature === "all" || (session.natureOfTheft && session.natureOfTheft.includes(nature as NatureOfTheft));

            return instructorMatch && planeMatch && natureMatch;
        });

        setSessionsFiltered(filteredSessions);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plane, instructor, nature, sessions]);

    // --- HELPERS ---
    const resetFilters = () => {
        setPlane("all");
        setInstructor("all");
        setNature("all");
        // Optionnel : fermer le popover au reset
        // setOpen(false); 
    }

    // Compter combien de filtres sont actifs
    const activeFiltersCount = [
        plane !== "all",
        instructor !== "all",
        nature !== "all"
    ].filter(Boolean).length;

    const hasActiveFilters = activeFiltersCount > 0;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        "h-9 border-dashed gap-2 transition-all duration-200 relative",
                        // Style actif : Bordure violette + fond violet très clair + texte violet
                        hasActiveFilters
                            ? "border-[#774BBE] bg-[#774BBE]/5 text-[#774BBE]"
                            : "border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                    )}
                >
                    <ListFilter className="w-4 h-4" />
                    <span className="font-medium">Filtres</span>

                    {/* Badge de compteur si filtres actifs */}
                    {hasActiveFilters && (
                        <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#774BBE] text-[10px] text-white animate-in zoom-in">
                            {activeFiltersCount}
                        </span>
                    )}

                    {/* Petite bordure verticale pour séparer si on voulait ajouter autre chose */}
                    {/* <div className="hidden sm:flex h-4 w-px bg-current opacity-20 mx-1" /> */}
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[320px] p-0 shadow-xl border-slate-100" align="end">
                {/* Header du Popover */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h4 className="font-semibold text-sm text-slate-800">Configurer l'affichage</h4>
                    {hasActiveFilters && (
                        <button
                            onClick={resetFilters}
                            className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                        >
                            Tout effacer
                        </button>
                    )}
                </div>

                {/* Corps du Popover (Les Inputs) */}
                <div className="p-4 space-y-4">

                    {/* 1. Instructeur */}
                    <div className="space-y-1.5">
                        <label className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                            <UserIcon className="w-3.5 h-3.5" /> Instructeur
                        </label>
                        <Select value={instructor} onValueChange={setInstructor}>
                            <SelectTrigger className={cn("w-full h-9", instructor !== "all" && "border-[#774BBE] ring-1 ring-[#774BBE]/20")}>
                                <SelectValue placeholder="Tous les instructeurs" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les instructeurs</SelectItem>
                                {instructors.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                        {item.firstName} {item.lastName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 2. Appareil */}
                    <div className="space-y-1.5">
                        <label className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                            <Plane className="w-3.5 h-3.5" /> Appareil
                        </label>
                        <Select value={plane} onValueChange={setPlane}>
                            <SelectTrigger className={cn("w-full h-9", plane !== "all" && "border-[#774BBE] ring-1 ring-[#774BBE]/20")}>
                                <SelectValue placeholder="Tous les appareils" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les appareils</SelectItem>
                                {planesProp.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                        {item.name}
                                    </SelectItem>
                                ))}
                                <SelectItem value="classroomSession">Session théorique</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 3. Type de vol */}
                    <div className="space-y-1.5">
                        <label className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5" /> Nature du vol
                        </label>
                        <Select value={nature} onValueChange={setNature}>
                            <SelectTrigger className={cn("w-full h-9", nature !== "all" && "border-[#774BBE] ring-1 ring-[#774BBE]/20")}>
                                <SelectValue placeholder="Tous les types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les types</SelectItem>
                                {flightNatures.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        <div className="flex items-center gap-2">
                                            <item.icon className="w-3.5 h-3.5 opacity-70" />
                                            <span>{item.label}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                </div>

                {/* Footer du Popover */}
                <div className="p-2 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <Button
                        size="sm"
                        className="bg-[#774BBE] hover:bg-[#6538a5] text-white h-8 text-xs w-full"
                        onClick={() => setOpen(false)}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                        Voir les résultats
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}

export default Filter;