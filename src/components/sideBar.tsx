"use client";

import React from "react";
import Image from "next/image";
import { ChevronDown, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/app/auth/login/action";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { navigationLinks } from "@/config/links";
import { Club, userRole } from "@prisma/client";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useSearchParams } from "next/navigation";
import { updateUserClub } from "@/api/db/users";
import packageJson from "../../package.json";
import { cn } from "@/lib/utils";

interface props {
    clubsProp: Club[]
}

const SideBar = ({ clubsProp }: props) => {
    const pathname = usePathname();
    const router = useRouter();
    const { currentUser } = useCurrentUser();
    const [isLoadingSignout, setIsLoadingSignout] = React.useState(false);
    const searchParams = useSearchParams();
    const clubID = searchParams.get("clubID");
    const [clubForAdmin, setClubForAdmin] = React.useState<string | null>(clubID);

    const handleNavigation = (href: string) => {
        router.push(href);
    };

    const logout = () => {
        setIsLoadingSignout(true);
        signOut();
    };

    const handleClubChange = async (clubID: string) => {
        setClubForAdmin(clubID);
        if (currentUser?.id) {
            await updateUserClub(currentUser.id, clubID);
            window.location.href = `/calendar?clubID=${clubID}`;
        }
    };

    // Helper pour le rôle (affichage propre)
    const getRoleLabel = (role?: string) => {
        switch (role) {
            case "STUDENT": return "Élève";
            case "PILOT": return "Pilote";
            case "OWNER": return "Président";
            case "ADMIN": return "Admin";
            case "INSTRUCTOR": return "Instructeur";
            case "MANAGER": return "Manager";
            default: return "Visiteur";
        }
    };

    return (
        <aside className="hidden lg:flex w-60 h-screen bg-[#1A1B1E] text-slate-300 flex-col transition-all duration-300 z-20 border-r border-white/5">
            {/* --- HEADER : LOGO --- */}
            <div className="h-20 flex items-center px-6 border-b border-white/5">
                <button
                    onClick={() => handleNavigation("/")}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                    <Image
                        src="/images/Logo_title.svg"
                        alt="Aero Connect"
                        width={140}
                        height={40}
                        className="w-auto h-8"
                        priority
                    />
                </button>
            </div>

            {/* --- SECTION ADMIN : SELECTEUR CLUB --- */}
            {currentUser?.role === userRole.ADMIN && (
                <div className="px-4 my-6">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group text-left">
                                <div className="flex flex-col items-start overflow-hidden">
                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">Club actif</span>
                                    <span className="font-semibold text-white text-sm truncate w-full group-hover:text-[#774BBE] transition-colors">
                                        {clubForAdmin || "Sélectionner"}
                                    </span>
                                </div>
                                <ChevronDown size={16} className="text-slate-500 group-hover:text-white flex-shrink-0" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[240px] bg-[#25262B] border-white/10 text-slate-300">
                            <DropdownMenuLabel className="text-slate-500">Changer de club</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/10" />
                            {clubsProp.map((club) => (
                                <DropdownMenuItem
                                    key={club.id}
                                    onClick={() => handleClubChange(club.id)}
                                    className="cursor-pointer focus:bg-[#774BBE] focus:text-white"
                                >
                                    {club.id}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}

            {/* --- NAVIGATION --- */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                <div className="space-y-1">
                    <p className="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Principal</p>
                    <nav className="space-y-1">
                        {navigationLinks
                            .filter((link) => link.roles.includes(currentUser?.role as userRole))
                            .map((link) => {
                                const IconComponent = link.icon;
                                const isActive = pathname === link.path;

                                return (
                                    <Link
                                        href={`${link.path}?clubID=${currentUser?.clubID || ""}`}
                                        key={link.name}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                                            isActive
                                                ? "bg-[#774BBE] text-white shadow-lg shadow-[#774BBE]/20" // Actif : Violet plein, très lisible sur fond sombre
                                                : "text-slate-400 hover:bg-white/5 hover:text-white" // Inactif : Gris clair -> Blanc
                                        )}
                                    >
                                        <IconComponent
                                            size={20}
                                            className={cn(
                                                "transition-colors",
                                                isActive ? "text-white" : "text-slate-500 group-hover:text-white"
                                            )}
                                        />
                                        <span className="relative z-10">{link.name}</span>
                                    </Link>
                                );
                            })}
                    </nav>
                </div>
            </div>

            {/* --- FOOTER : PROFIL & LOGOUT --- */}
            <div className="p-4 border-t border-white/5 bg-black/20">
                <Link
                    href={`/profile?clubID=${currentUser?.clubID}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-all mb-3 group"
                >
                    <div className="relative">
                        <Image
                            src="/images/profilePicture.png"
                            alt="User"
                            width={40}
                            height={40}
                            className="rounded-full border border-white/10 group-hover:border-[#774BBE] transition-colors"
                        />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#1A1B1E] rounded-full"></div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="font-semibold text-sm text-white truncate group-hover:text-[#774BBE] transition-colors">
                            {currentUser?.lastName} {currentUser?.firstName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                            {getRoleLabel(currentUser?.role)}
                        </p>
                    </div>
                </Link>

                <div className="flex items-center justify-between pt-2 px-2">
                    <p className="text-[10px] text-slate-600 font-mono">
                        v{packageJson.version}
                    </p>
                    <button
                        className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-red-400 hover:bg-red-400/10 px-3 py-1.5 rounded-md transition-all"
                        onClick={logout}
                        disabled={isLoadingSignout}
                    >
                        <LogOut size={14} />
                        {isLoadingSignout ? "..." : "Déconnexion"}
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default SideBar;