import { userRole } from "@prisma/client";
import { BetweenHorizontalStart, CalendarDays, Plane, GraduationCap, User } from 'lucide-react'

type Role = userRole

interface NavLink {
    name: string;
    path: string;
    icon: React.ElementType;
    roles: Role[];
}

export const navigationLinks: NavLink[] = [
    {
        name: "Calendrier",
        path: "/homePage",
        icon: CalendarDays, // Icône JSX
        roles: ["USER", "STUDENT", "PILOT", "OWNER", "ADMIN"], // Rôles autorisés
    },
    {
        name: "Vols",
        path: "/flights",
        icon: BetweenHorizontalStart, // Icône JSX
        roles: ["USER", "STUDENT", "PILOT", "OWNER", "ADMIN"],
    },
    {
        name: "Aéronefs",
        path: "/plane",
        icon: Plane, // Icône JSX
        roles: ["PILOT", "OWNER", "ADMIN"],
    },
    {
        name: "Elèves",
        path: "/students",
        icon: GraduationCap, // Icône JSX
        roles: ["PILOT", "OWNER", "ADMIN"],
    },
    {
        name: "Profil",
        path: "/profile",
        icon: User, // Icône JSX
        roles: ["USER", "STUDENT", "PILOT", "OWNER", "ADMIN"],
    }
]