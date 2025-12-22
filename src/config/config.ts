import { NatureOfTheft } from "@prisma/client";
import { GraduationCap, Briefcase, Camera, Plane, Award } from "lucide-react";

// Liste des classes possibles
export const aircraftClasses = [
    {
        id: 1,
        label: "Paramoteur",
        handle: "Classe ULM",
        color: "#E9D5FF", // Equivalent HEX pour bg-purple-100
    },
    {
        id: 2,
        label: "Pendulaire",
        handle: "Classe ULM",
        color: "#DBEAFE", // Equivalent HEX pour bg-blue-100
    },
    {
        id: 3,
        label: "Multiaxe",
        handle: "Classe ULM",
        color: "#D1FAE5", // Equivalent HEX pour bg-green-100
    },
    {
        id: 4,
        label: "Autogire",
        handle: "Classe ULM",
        color: "#FECACA", // Equivalent HEX pour bg-red-100
    },
    {
        id: 5,
        label: "Aerostat",
        handle: "Classe ULM",
        color: "#FEF9C3", // Equivalent HEX pour bg-yellow-100
    },
    {
        id: 6,
        label: "Hélicoptère",
        handle: "Classe ULM",
        color: "#FED7AA", // Equivalent HEX pour bg-orange-100
    },
];

// Minutes et heures par défaut
export const defaultMinutes = ['00', '15', '30', '45']
export const defaultHours = [
    9, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 19.0
]

// Liste des mois et jours
export const monthFr = [ "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
export const dayFr = [ "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]


// Configuration des natures de vol
export interface FlightNatureConfig {
    value: NatureOfTheft
    label: string
    style: string
    icon: React.ElementType
}

export const flightNatures: FlightNatureConfig[] = [
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
        label: "Baptême ou Vol Onéreux",
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