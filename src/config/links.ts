import { userRole } from "@prisma/client";
import { BetweenHorizontalStart, BookOpen, CalendarDays, Plane, GraduationCap, User, ChartLine, Wallet } from 'lucide-react'

type Role = userRole

interface NavLink {
    name: string;
    path: string;
    icon: React.ElementType;
    roles: Role[];
    // Only shown when the student wallet is enabled for the club (AER-66).
    requiresWallet?: boolean;
}
export const navigationLinks: NavLink[] = [
    {
        name: "Calendrier",
        path: "/calendar",
        icon: CalendarDays,
        roles: ["USER", "STUDENT", "PILOT", "MANAGER", "OWNER", "ADMIN", "INSTRUCTOR"],
    },
    {
        name: "Vols",
        path: "/flights",
        icon: BetweenHorizontalStart,
        roles: ["USER", "STUDENT", "PILOT", "MANAGER", "OWNER", "ADMIN", "INSTRUCTOR"],
    },
    {
        name: "Carnet de vol",
        path: "/logbook",
        icon: BookOpen,
        roles: ["MANAGER", "OWNER", "ADMIN", "INSTRUCTOR", "STUDENT", "PILOT"],
    },
    {
        name: "Portefeuille",
        path: "/wallet",
        icon: Wallet,
        // Student / pilot: their wallet; instructor (read-only) and management: the
        // club's wallets (see WalletPageComponent).
        roles: ["STUDENT", "PILOT", "INSTRUCTOR", "MANAGER", "OWNER", "ADMIN"],
        requiresWallet: true,
    },
    {
        name: "Avions",
        path: "/planes",
        icon: Plane,
        roles: ["PILOT", "MANAGER", "OWNER", "ADMIN", "INSTRUCTOR", "STUDENT"],
    },
    {
        name: "Utilisateurs",
        path: "/students",
        icon: GraduationCap,
        roles: ["MANAGER", "OWNER", "ADMIN", "INSTRUCTOR"],
    },
    {
        name: "Club",
        path: "/dashboard",
        icon: ChartLine,
        // Open to every member: the displayed content is filtered by role (see
        // src/lib/clubAccess.ts). Non-management members only see the club's public
        // info and the discovery-flight booking link.
        roles: ["USER", "STUDENT", "PILOT", "INSTRUCTOR", "MANAGER", "OWNER", "ADMIN"],
    },
    {
        name: "Profil",
        path: "/profile",
        icon: User,
        roles: ["USER", "STUDENT", "PILOT", "MANAGER", "OWNER", "ADMIN", "INSTRUCTOR"],
    }
]

// Indexes derived from the path: the menu order can change without breaking
// components that target a specific link.
const indexOfPath = (path: string) => navigationLinks.findIndex((link) => link.path === path);

export const indexLinkPlane = indexOfPath("/planes");
export const indexLinkDashboard = indexOfPath("/dashboard");
export const indexLinkStudents = indexOfPath("/students");