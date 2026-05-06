import { userRole } from "@prisma/client";
import { BetweenHorizontalStart, BookOpen, CalendarDays, Plane, GraduationCap, User, ChartLine } from 'lucide-react'

type Role = userRole

interface NavLink {
    name: string;
    path: string;
    icon: React.ElementType;
    roles: Role[];
}
export const indexLinkPlane = 4;
export const indexLinkDashboard = 1;

export const navigationLinks: NavLink[] = [
    {
        name: "Calendrier",
        path: "/calendar",
        icon: CalendarDays, // Icône JSX
        roles: ["USER", "STUDENT", "PILOT", "MANAGER", "OWNER", "ADMIN", "INSTRUCTOR"], // Rôles autorisés
    },
    {
        name: "Club",
        path: "/dashboard",
        icon: ChartLine, // Icône JSX
        roles: ["MANAGER", "OWNER", "ADMIN"], // Rôles autorisés
    },
    {
        name: "Vols",
        path: "/flights",
        icon: BetweenHorizontalStart, // Icône JSX
        roles: ["USER", "STUDENT", "PILOT", "MANAGER", "OWNER", "ADMIN", "INSTRUCTOR"],
    },
    {
        name: "Carnet de vol",
        path: "/logbook",
        icon: BookOpen,
        roles: ["MANAGER", "OWNER", "ADMIN", "INSTRUCTOR", "STUDENT"],
    },
    {
        name: "Avions",
        path: "/planes",
        icon: Plane, // Icône JSX
        roles: ["PILOT", "MANAGER", "OWNER", "ADMIN", "INSTRUCTOR", "STUDENT"],
    },
    {
        name: "Utilisateurs",
        path: "/students",
        icon: GraduationCap, // Icône JSX
        roles: ["MANAGER", "OWNER", "ADMIN", "INSTRUCTOR"],
    },
    {
        name: "Profil",
        path: "/profile",
        icon: User, // Icône JSX
        roles: ["USER", "STUDENT", "PILOT", "MANAGER", "OWNER", "ADMIN", "INSTRUCTOR"],
    }
]