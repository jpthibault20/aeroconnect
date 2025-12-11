import { flight_sessions, planes, User, userRole } from '@prisma/client'
import React, { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { User as UserIcon, Plane, SlidersHorizontal, FilterX } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '@/lib/utils'

interface Props {
    sessions: flight_sessions[],
    display: "desktop" | "phone"
    setSessionsFiltered: React.Dispatch<React.SetStateAction<flight_sessions[]>>
    planesProp: planes[]
    usersProps: User[]
}

const Filter = ({ sessions, setSessionsFiltered, display, planesProp, usersProps }: Props) => {
    const [plane, setPlane] = useState("all") // Stocke l'ID de l'avion sélectionné
    const [instructor, setInstructor] = useState("all") // Stocke l'ID de l'instructeur sélectionné

    const instructors = usersProps.filter((instructor) => instructor.role === userRole.INSTRUCTOR || instructor.role === userRole.OWNER);

    // Effet pour filtrer les sessions lorsque l'avion ou l'instructeur change
    useEffect(() => {
        const filteredSessions = sessions?.filter(session => {
            const instructorMatch = instructor === "all" || session.pilotID === instructor;
            const planeMatch = plane === "all" || session.planeID.includes(plane);
            return instructorMatch && planeMatch;
        });

        setSessionsFiltered(filteredSessions);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plane, instructor, sessions]);

    // Fonction pour reset les filtres
    const resetFilters = () => {
        setPlane("all");
        setInstructor("all");
    }

    const hasActiveFilters = plane !== "all" || instructor !== "all";

    if (display === "desktop") {
        return (
            <div className='flex items-center gap-1'>
                {/* Filtre par Instructeur */}
                <Select value={instructor} onValueChange={(val) => setInstructor(val)}>
                    <SelectTrigger
                        className={cn(
                            "h-8 border-none shadow-none bg-transparent hover:bg-slate-50 focus:ring-0 gap-2 min-w-[130px] px-2 transition-colors",
                            instructor !== "all" ? "text-[#774BBE] font-medium" : "text-slate-600"
                        )}
                    >
                        <UserIcon className={cn("w-4 h-4", instructor !== "all" ? "text-[#774BBE]" : "text-slate-400")} />
                        <div className="truncate text-xs">
                            <SelectValue placeholder="Instructeurs" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-slate-500 font-medium">Tous les instructeurs</SelectItem>
                        {instructors.map((item, index) => (
                            <SelectItem key={index} value={item.id}>
                                {item.firstName} {item.lastName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Séparateur visuel léger entre les deux filtres */}
                <div className="w-px h-4 bg-slate-200" />

                {/* Filtre par Avion */}
                <Select value={plane} onValueChange={(val) => setPlane(val)}>
                    <SelectTrigger
                        className={cn(
                            "h-8 border-none shadow-none bg-transparent hover:bg-slate-50 focus:ring-0 gap-2 min-w-[130px] px-2 transition-colors",
                            plane !== "all" ? "text-[#774BBE] font-medium" : "text-slate-600"
                        )}
                    >
                        <Plane className={cn("w-4 h-4", plane !== "all" ? "text-[#774BBE]" : "text-slate-400")} />
                        <div className="truncate text-xs">
                            <SelectValue placeholder="Appareils" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-slate-500 font-medium">Tous les appareils</SelectItem>
                        {planesProp.map((item, index) => (
                            <SelectItem key={index} value={item.id}>
                                {item.name}
                            </SelectItem>
                        ))}
                        <SelectItem value="classroomSession">Session théorique</SelectItem>
                    </SelectContent>
                </Select>

                {/* Bouton Reset (visible seulement si filtres actifs) */}
                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                        onClick={resetFilters}
                        title="Réinitialiser les filtres"
                    >
                        <FilterX className="w-3 h-3" />
                    </Button>
                )}
            </div>
        )
    }
    else if (display === "phone") {
        return (
            <div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className={cn("h-8 w-8", hasActiveFilters ? "border-[#774BBE] text-[#774BBE] bg-purple-50" : "")}>
                            <SlidersHorizontal className="w-4 h-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-[280px] p-4' align="end">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm">Filtres</h4>
                                {hasActiveFilters && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-auto p-0 text-xs text-red-500 hover:text-red-600 hover:bg-transparent"
                                        onClick={resetFilters}
                                    >
                                        Réinitialiser
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-3">
                                {/* Filtre par Instructeur */}
                                <div className="space-y-1.5">
                                    <label className="text-xs text-slate-500 uppercase font-medium">Instructeur</label>
                                    <Select value={instructor} onValueChange={(val) => setInstructor(val)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Instructeurs" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tous</SelectItem>
                                            {instructors.map((item, index) => (
                                                <SelectItem key={index} value={item.id}>
                                                    {item.firstName} {item.lastName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Filtre par Avion */}
                                <div className="space-y-1.5">
                                    <label className="text-xs text-slate-500 uppercase font-medium">Appareil</label>
                                    <Select value={plane} onValueChange={(val) => setPlane(val)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Avions" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tous</SelectItem>
                                            {planesProp.map((item, index) => (
                                                <SelectItem key={index} value={item.id}>
                                                    {item.name}
                                                </SelectItem>
                                            ))}
                                            <SelectItem value="classroomSession">Session théorique</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        )
    }
    else return null
}

export default Filter;