import { flight_sessions } from '@prisma/client'
import React, { useEffect, useState } from 'react'
import { planeExemple } from '@/config/configClub'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { getInsctructors } from '@/api/global function/get'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Settings2 } from 'lucide-react'

interface Props {
    sessions: flight_sessions[],
    display: string,
    setSessionsFiltered: React.Dispatch<React.SetStateAction<flight_sessions[]>>
}

const Filter = ({ sessions, setSessionsFiltered, display }: Props) => {
    const [plane, setPlane] = useState("all") // Stocke l'ID de l'avion sélectionné
    const [instructor, setInstructor] = useState("all") // Stocke l'ID de l'instructeur sélectionné
    const Instructors = getInsctructors(); // Récupère les instructeurs

    // Effet pour filtrer les sessions lorsque l'avion ou l'instructeur change
    useEffect(() => {
        const filteredSessions = sessions.filter(session => {
            // Si "Tous" est sélectionné pour l'instructeur, toutes les sessions sont valides pour ce critère
            const instructorMatch = instructor === "all" || session.pilotID === instructor;

            // Si "Tous" est sélectionné pour l'avion, toutes les sessions sont valides pour ce critère
            const planeMatch = plane === "all" || session.planeID.includes(plane);

            // Retourne true si la session correspond aux deux filtres (ou si "Tous" est sélectionné)
            return instructorMatch && planeMatch;
        });

        // Mettre à jour les sessions filtrées
        setSessionsFiltered(filteredSessions);

    }, [plane, instructor, sessions, setSessionsFiltered]);

    if (display === "desktop") {
        return (
            <div className='flex space-y-0 space-x-3'>
                {/* Filtre par Instructeur */}
                <div>
                    <Select value={instructor} onValueChange={(val) => setInstructor(val)}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Instructeurs" />
                        </SelectTrigger>
                        <SelectContent>
                            {/* Option pour "Tous" les instructeurs */}
                            <SelectItem value="all">Instructeurs</SelectItem>
                            {Instructors.map((item, index) => (
                                <SelectItem key={index} value={item.id}>
                                    {item.firstName} {item.lastName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Filtre par Avion */}
                <div>
                    <Select value={plane} onValueChange={(val) => setPlane(val)}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Avions" />
                        </SelectTrigger>
                        <SelectContent>
                            {/* Option pour "Tous" les avions */}
                            <SelectItem value="all">Avions</SelectItem>
                            {planeExemple.map((item, index) => (
                                <SelectItem key={index} value={item.id}>
                                    {item.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        )
    }
    else if (display === "phone") {
        return (
            <div>
                <Popover>
                    <PopoverTrigger >
                        <Settings2 />  {/* Icon trigger for opening the popover */}
                    </PopoverTrigger>
                    <PopoverContent>
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">Filtres</h4>
                                <p className="text-sm text-muted-foreground">
                                    Définissez vos filtres
                                </p>
                            </div>
                            <div className="space-y-3">
                                {/* Filtre par Instructeur */}
                                <div>
                                    <Select value={instructor} onValueChange={(val) => setInstructor(val)}>
                                        <SelectTrigger className="w-[120px]">
                                            <SelectValue placeholder="Instructeurs" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {/* Option pour "Tous" les instructeurs */}
                                            <SelectItem value="all">Instructeurs</SelectItem>
                                            {Instructors.map((item, index) => (
                                                <SelectItem key={index} value={item.id}>
                                                    {item.firstName} {item.lastName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Filtre par Avion */}
                                <div>
                                    <Select value={plane} onValueChange={(val) => setPlane(val)}>
                                        <SelectTrigger className="w-[120px]">
                                            <SelectValue placeholder="Avions" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {/* Option pour "Tous" les avions */}
                                            <SelectItem value="all">Avions</SelectItem>
                                            {planeExemple.map((item, index) => (
                                                <SelectItem key={index} value={item.id}>
                                                    {item.name}
                                                </SelectItem>
                                            ))}
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
