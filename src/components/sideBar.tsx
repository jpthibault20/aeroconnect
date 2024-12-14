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
} from "@/components/ui/dropdown-menu"
import { useSearchParams } from "next/navigation";
import { updateUserClub } from "@/api/db/users";

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
        router.push(href); // Navigation instantanée
    };

    const logout = () => {
        signOut();
        setIsLoadingSignout(true);
    };

    const handleClubChange = async (clubID: string) => {
        setClubForAdmin(clubID);

        if (currentUser?.id) {
            await updateUserClub(currentUser.id, clubID);
            window.location.href = `/calendar?clubID=${clubID}`;
        }

    };

    return (
        <aside className="hidden lg:flex w-64 h-screen bg-[#212121] text-white flex-col">
            <button className="p-4 flex items-center" onClick={() => handleNavigation("/")}>
                <Image
                    src="/images/Logo_title.svg"
                    alt="Aero Connect"
                    width={150}
                    height={40}
                    className="w-150 h-auto"
                    priority
                />
            </button>

            <div className="border-1 border-b border-[#797979] mx-3 mb-6" />

            <Link
                href={`/profile?clubID=${currentUser?.clubID}`}
                className="bg-[#9BAAD1] p-1 mb-4 flex items-center mx-3 rounded-lg"
            >
                <Image
                    src="/images/profilePicture.png"
                    alt="User"
                    width={40}
                    height={40}
                    className="rounded-full mr-3"
                />
                <div className="w-full">
                    <p className="border-b font-medium text-sm w-fit">
                        {currentUser?.lastName} {currentUser?.firstName}
                    </p>
                    <p className="text-sm ">
                        {currentUser?.role === "STUDENT"
                            ? "Élève"
                            : currentUser?.role === "PILOT"
                                ? "Pilote"
                                : currentUser?.role === "OWNER"
                                    ? "Président"
                                    : currentUser?.role === "ADMIN"
                                        ? "Administrateur"
                                        : "Visiteur"
                        }
                    </p>
                </div>
            </Link>

            {currentUser?.role === userRole.ADMIN &&
            <div className="flex items-center justify-between space-x-2 mb-4 mx-3 px-4">
                <p>
                    club :
                </p>
                <div className="shadow-sm shadow-white rounded-lg bg-white px-2 py-1 text-black mr-6">
                    <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center space-x-4">
                            <p>
                                {clubForAdmin}
                            </p>
                            <ChevronDown size={20} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {clubsProp.map((club) => {
                                return (
                                    <DropdownMenuItem onClick={() => handleClubChange(club.id)} key={club.id}>
                                        {club.id}
                                    </DropdownMenuItem>
                                );
                            })}

                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
}

            <nav className="flex-1">
                {navigationLinks
                    .filter((link) => link.roles.includes(currentUser?.role as userRole))
                    .map((link) => {
                        const IconComponent = link.icon;
                        return (
                            <Link
                                href={`${link.path}?clubID=${currentUser?.clubID || ""}`}
                                key={link.name}
                                className={`flex items-center px-4 py-4 mx-3 ${pathname === link.path
                                    ? "rounded-full bg-[#3E3E3E] text-white"
                                    : "text-[#C2C2C2] hover:text-white"
                                    }`}
                            >
                                <IconComponent className="mr-3" size={25} />
                                {link.name}
                            </Link>
                        );
                    })}
            </nav>

            <div className="border-1 border-b border-[#797979] mx-3 mb-6" />

            <button
                className="flex items-center px-4 py-2 hover:bg-slate-800 mt-auto mb-4 text-white"
                onClick={logout}
            >
                <LogOut className="mr-3" size={20} />
                {isLoadingSignout ? (
                    "Déconnexione en cours..."
                ) : (
                    "Déconnexion"
                )}
            </button>
        </aside>
    );
};

export default SideBar;
