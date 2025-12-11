"use client"

import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown, X } from 'lucide-react'
import { ScrollArea } from "@/components/ui/scroll-area"
import { BiSolidPlaneAlt } from "react-icons/bi";
import { aircraftClasses } from "@/config/config"
import { useCurrentClub } from "@/app/context/useCurrentClub"

interface Props {
    disabled: boolean
    classes: number[]
    setClasses: React.Dispatch<React.SetStateAction<number[]>>
}

const AircraftClassSelector = ({ disabled, classes, setClasses }: Props) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const { currentClub } = useCurrentClub();
    const [classesList, setClassesList] = useState(aircraftClasses.filter(c => currentClub?.classes.includes(c.id)));
    const dropdownRef = useRef<HTMLDivElement>(null); // Typage explicite

    useEffect(() => {
        setClassesList(aircraftClasses.filter(c => currentClub?.classes.includes(c.id)))
    }, [currentClub])

    // Fermer le dropdown si on clique à l'extérieur
    const handleClickOutside = (event: MouseEvent) => {
        if (
            dropdownRef.current &&
            !dropdownRef.current.contains(event.target as Node) // Vérification sécurisée
        ) {
            setIsDropdownOpen(false);
        }
    };

    // Ajout et suppression de l'écouteur d'événement
    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleClassToggle = (classId: number) => {
        setClasses((prev) =>
            prev.includes(classId)
                ? prev.filter((id) => id !== classId)
                : [...prev, classId]
        )
    }

    const removeSelected = (classId: number) => {
        setClasses((prev) => prev.filter((id) => id !== classId))
    }


    return (
        <div>
            <div className="rounded-md shadow-sm border border-gray-200 p-2 flex flex-row justify-between items-center">
                {/* Section des classes sélectionnées */}
                <div className="flex flex-wrap gap-2">
                    {classes.map((classId) => {
                        const aircraftClass = classesList.find((c) => c.id === classId);
                        return (
                            <div
                                key={classId}
                                style={{ backgroundColor: aircraftClass?.color }}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm  ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                            >
                                {aircraftClass?.label}
                                <button
                                    disabled={disabled}
                                    type="button"
                                    onClick={() => removeSelected(classId)}
                                    className="hover:bg-black/5 rounded-full p-0.5"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Dropdown pour sélectionner les classes */}
                <div ref={dropdownRef} className="relative flex-1">
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setIsDropdownOpen((prev) => !prev)}
                        className={`w-full flex justify-end items-center ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                        <ChevronDown />
                    </button>
                    {isDropdownOpen && (
                        <div className="absolute bottom-full right-0 mt-2 w-64 bg-white border border-gray-300 rounded-md shadow-lg z-10">
                            <ScrollArea className="p-4 space-y-1 h-fit">
                                {classesList.map((aircraftClass) => {
                                    const isSelected = classes.includes(aircraftClass.id);
                                    return (
                                        <button
                                            key={aircraftClass.id}
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => handleClassToggle(aircraftClass.id)}
                                            className={`flex flex-1 items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors ${isSelected ? "bg-gray-50" : ""
                                                } cursor-pointer justify-between w-full`}
                                        >
                                            <div
                                                style={{ backgroundColor: aircraftClass?.color }}
                                                className={`w-10 h-10 rounded-full flex items-center justify-center`}
                                            >
                                                <BiSolidPlaneAlt size={18} />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className="font-medium">{aircraftClass.label}</div>
                                                <div className="text-sm text-gray-500">
                                                    {aircraftClass.handle}
                                                </div>
                                            </div>
                                            <div className="w-5">
                                                {isSelected && (
                                                    <div className="rounded-full bg-black">
                                                        <Check size={20} className="text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </ScrollArea>
                        </div>
                    )}
                </div>
            </div>
        </div>

    )
}

export default AircraftClassSelector