"use client"

import { useEffect, useRef, useState } from "react"
// J'ai ajouté ListChecks pour l'icône "Tout sélectionner"
import { Check, ChevronDown, X, Briefcase, GraduationCap, Plane, Camera, Award, ListChecks } from 'lucide-react'
import { NatureOfTheft } from "@prisma/client"
import { cn } from "@/lib/utils"

interface FlightNatureConfig {
    value: NatureOfTheft
    label: string
    style: string
    icon: React.ElementType
}

const flightNatures: FlightNatureConfig[] = [
    {
        value: "TRAINING",
        label: "Instruction",
        style: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
        icon: GraduationCap
    },
    {
        value: "PRIVATE",
        label: "Privé",
        style: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
        icon: Briefcase
    },
    {
        value: "SIGHTSEEING",
        label: "Baptême (VLO)",
        style: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
        icon: Camera
    },
    {
        value: "DISCOVERY",
        label: "Découverte (VLD)",
        style: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
        icon: Plane
    },
    {
        value: "EXAM",
        label: "Examen",
        style: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
        icon: Award
    },
]

interface Props {
    selectedNatures: NatureOfTheft[]
    onChange: (natures: NatureOfTheft[]) => void
    disabled?: boolean
}

const FlightNatureSelector = ({ selectedNatures, onChange, disabled }: Props) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // --- LOGIQUE TOUT SÉLECTIONNER ---
    // 1. Liste de toutes les valeurs possibles
    const allValues = flightNatures.map(n => n.value);

    // 2. Est-ce que tout est coché ?
    const isAllSelected = flightNatures.length > 0 && selectedNatures.length === flightNatures.length;

    // 3. Fonction de bascule
    const toggleAll = () => {
        if (isAllSelected) {
            onChange([]); // Tout désélectionner
        } else {
            onChange(allValues); // Tout sélectionner
        }
    }
    // ----------------------------------

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleNature = (nature: NatureOfTheft) => {
        if (selectedNatures.includes(nature)) {
            onChange(selectedNatures.filter((n) => n !== nature));
        } else {
            onChange([...selectedNatures, nature]);
        }
    }

    return (
        <div ref={dropdownRef} className="relative w-full text-sm font-sans">
            {/* INPUT / CONTAINER */}
            <div
                className={cn(
                    "min-h-[40px] w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2",
                    "flex flex-wrap gap-2 items-center cursor-pointer transition-all duration-200",
                    "hover:border-slate-300 hover:bg-slate-100/50",
                    isDropdownOpen && "ring-2 ring-[#774BBE] ring-offset-2 border-transparent",
                    disabled && "opacity-60 cursor-not-allowed"
                )}
                onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
            >
                {selectedNatures.length === 0 && (
                    <span className="text-slate-500 font-normal">Sélectionner le type de vol...</span>
                )}

                {selectedNatures.map((natureVal) => {
                    const config = flightNatures.find(n => n.value === natureVal);
                    if (!config) return null;
                    const Icon = config.icon;

                    return (
                        <div
                            key={natureVal}
                            className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border shadow-sm animate-in fade-in zoom-in duration-200",
                                config.style
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Icon size={12} className="opacity-70" />
                            {config.label}
                            <button
                                type="button"
                                onClick={() => toggleNature(natureVal)}
                                className="ml-1 rounded-full p-0.5 hover:bg-black/10 transition-colors"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    );
                })}

                <div className="ml-auto flex items-center pl-2">
                    <ChevronDown className={cn(
                        "w-4 h-4 text-slate-400 transition-transform duration-200",
                        isDropdownOpen && "rotate-180 text-[#774BBE]"
                    )} />
                </div>
            </div>

            {/* DROPDOWN */}
            {isDropdownOpen && !disabled && (
                <div className="absolute top-full left-0 mt-1.5 w-full bg-white border border-slate-100 rounded-xl shadow-xl z-[999] overflow-hidden animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5">
                    <div className="max-h-[260px] overflow-y-auto p-1.5 custom-scrollbar">

                        {/* --- BOUTON TOUT SÉLECTIONNER --- */}
                        <button
                            type="button"
                            onClick={toggleAll}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 font-medium",
                                isAllSelected
                                    ? "bg-slate-100 text-slate-900"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors border",
                                isAllSelected ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-400 border-slate-200"
                            )}>
                                <ListChecks size={14} />
                            </div>

                            <div className="flex-1 text-left">
                                Tout sélectionner
                            </div>

                            {isAllSelected && (
                                <div className="text-slate-800 animate-in slide-in-from-left-2 fade-in">
                                    <Check size={16} strokeWidth={2.5} />
                                </div>
                            )}
                        </button>

                        {/* SÉPARATEUR */}
                        <div className="h-px bg-slate-100 my-1 mx-2" />
                        {/* -------------------------------- */}

                        {flightNatures.map((item) => {
                            const isSelected = selectedNatures.includes(item.value);
                            const Icon = item.icon;

                            return (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => toggleNature(item.value)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 mb-0.5",
                                        isSelected
                                            ? "bg-[#774BBE]/5 text-[#774BBE] font-medium"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                                        isSelected ? "bg-[#774BBE] text-white" : "bg-slate-100 text-slate-500"
                                    )}>
                                        <Icon size={14} />
                                    </div>

                                    <div className="flex-1 text-left">
                                        {item.label}
                                    </div>

                                    {isSelected && (
                                        <div className="text-[#774BBE] animate-in slide-in-from-left-2 fade-in">
                                            <Check size={16} strokeWidth={2.5} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

export default FlightNatureSelector