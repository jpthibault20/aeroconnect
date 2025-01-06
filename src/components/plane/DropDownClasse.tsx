import React, { useEffect, useState } from 'react'
import { Label } from '../ui/label'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'
import { aircraftClasses } from '@/config/config'
import { planes } from '@prisma/client'
import { useCurrentClub } from '@/app/context/useCurrentClub'

interface props {
    planeProp: planes
    setPlaneProp: React.Dispatch<React.SetStateAction<planes>>
}
export const DropDownClasse = ({ planeProp, setPlaneProp }: props) => {
    const { currentClub } = useCurrentClub();
    const [classesList, setClassesList] = useState(aircraftClasses.filter(c => currentClub?.classes.includes(c.id)));

    useEffect(() => {
        setClassesList(aircraftClasses.filter(c => currentClub?.classes.includes(c.id)))
    }, [currentClub])


    return (
        <div>
            <Label>
                Classe de l&apos;avion
            </Label>
            <DropdownMenu>
                <DropdownMenuTrigger className='w-full flex justify-between shadow-sm border-gray-200 border rounded-md px-2 py-2'>
                    {classesList.find(c => c.id === planeProp.classes)?.label || "Classe ULM"}
                    <ChevronDown />
                </DropdownMenuTrigger>
                <DropdownMenuContent className='h-fit'>
                    {classesList.map((aircraftClass) => (
                        <DropdownMenuItem
                            key={aircraftClass.id}
                            onClick={() => setPlaneProp((prev) => ({ ...prev, classes: aircraftClass.id }))}
                            className='flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors'
                        >
                            {aircraftClass.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}

