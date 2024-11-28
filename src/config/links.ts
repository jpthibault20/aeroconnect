import { userRole } from "@prisma/client";
import { BetweenHorizontalStart, CalendarDays, Plane, GraduationCap, User } from 'lucide-react'

type Role = userRole

interface NavLink {
    name: string;
    path: string;
    icon: React.ElementType;
    roles: Role[];
}

export const indexLinkPlane = 2;

export const navigationLinks: NavLink[] = [
    {
        name: "Calendrier",
        path: "/calendar",
        icon: CalendarDays, // Icône JSX
        roles: ["USER", "STUDENT", "PILOT", "OWNER", "ADMIN", "INSTRUCTOR"], // Rôles autorisés
    },
    {
        name: "Vols",
        path: "/flights",
        icon: BetweenHorizontalStart, // Icône JSX
        roles: ["USER", "STUDENT", "PILOT", "OWNER", "ADMIN", "INSTRUCTOR"],
    },
    {
        name: "Avions",
        path: "/planes",
        icon: Plane, // Icône JSX
        roles: ["PILOT", "OWNER", "ADMIN", "INSTRUCTOR"],
    },
    {
        name: "Elèves",
        path: "/students",
        icon: GraduationCap, // Icône JSX
        roles: ["OWNER", "ADMIN", "INSTRUCTOR"],
    },
    {
        name: "Profil",
        path: "/profile",
        icon: User, // Icône JSX
        roles: ["USER", "STUDENT", "PILOT", "OWNER", "ADMIN", "INSTRUCTOR"],
    }
]