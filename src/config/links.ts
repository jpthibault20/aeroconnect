import { userRole } from "@prisma/client";
import { BetweenHorizontalStart, BookOpen, CalendarDays, Plane, GraduationCap, User, ChartLine } from 'lucide-react'

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
        path: "/calendar",
        icon: CalendarDays, // Icône JSX
        roles: ["USER", "STUDENT", "PILOT", "MANAGER", "OWNER", "ADMIN", "INSTRUCTOR"], // Rôles autorisés
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
        roles: ["MANAGER", "OWNER", "ADMIN", "INSTRUCTOR", "STUDENT", "PILOT"],
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
        name: "Club",
        path: "/dashboard",
        icon: ChartLine, // Icône JSX
        // Ouvert à tous les membres : le contenu affiché est filtré par rôle
        // (cf. src/lib/clubAccess.ts). Les non-gestionnaires n'y voient que les
        // informations publiques du club et le lien de réservation baptême.
        roles: ["USER", "STUDENT", "PILOT", "INSTRUCTOR", "MANAGER", "OWNER", "ADMIN"],
    },
    {
        name: "Profil",
        path: "/profile",
        icon: User, // Icône JSX
        roles: ["USER", "STUDENT", "PILOT", "MANAGER", "OWNER", "ADMIN", "INSTRUCTOR"],
    }
]

// Index dérivés du chemin : l'ordre du menu peut changer sans casser les
// composants qui ciblent un lien précis.
const indexOfPath = (path: string) => navigationLinks.findIndex((link) => link.path === path);

export const indexLinkPlane = indexOfPath("/planes");
export const indexLinkDashboard = indexOfPath("/dashboard");
export const indexLinkStudents = indexOfPath("/students");