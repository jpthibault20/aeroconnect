"use client"

import { useCurrentUser } from '@/app/context/useCurrentUser'
import { navigationLinks } from '@/config/links'
import { userRole } from '@prisma/client'
import React, { useState, useEffect, useRef } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet'
import { Button } from './ui/button'
import { LogOut, Menu, X, ChevronDown } from 'lucide-react'
import { signOut } from '@/app/auth/login/action'
import { updateUserClub } from '@/api/db/users'
import { toast } from '@/hooks/use-toast'
import Link from 'next/link'
import Image from 'next/image'
import packageJson from "../../package.json";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import type { NavigationCounts } from "@/hooks/useNavigationCounts";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { isBookingGatedRole } from "@/lib/wallet";
import BalancePill from "./wallet/BalancePill";
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Club } from '@prisma/client'

interface NavBarProps {
    clubsProp: Club[]
    counts: NavigationCounts
}

const NavBar = ({ clubsProp, counts }: NavBarProps) => {
    const { currentUser } = useCurrentUser()
    const [isOpen, setIsOpen] = useState(false)
    const { requestCount, maintenanceCount, baptemeCount, walletAlert, wallet } = counts;
    const { currentClub } = useCurrentClub();
    const showBalance = wallet.enabled && isBookingGatedRole(currentUser?.role) && wallet.balanceCents != null;
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const clubID = searchParams.get("clubID");
    const [clubForAdmin, setClubForAdmin] = useState<string | null>(clubID);

    const handleClubChange = async (newClubID: string) => {
        setClubForAdmin(newClubID);
        setIsOpen(false);
        if (currentUser?.id) {
            const res = await updateUserClub(currentUser.id, newClubID);
            if ('error' in res) {
                setClubForAdmin(clubID);
                toast({ title: "Changement de club impossible", description: res.error, variant: "destructive" });
                return;
            }
            // Full reload: user / club contexts are re-read server-side.
            window.location.assign(`/calendar?clubID=${newClubID}`);
        }
    };

    const filteredLinks = navigationLinks.filter(link =>
        link.roles.includes(currentUser?.role as userRole)
        && (!link.requiresWallet || !!currentClub?.walletEnabled)
    )

    // --- Menu scroll indicator ---
    // On a small screen the panel only shows a few entries at a time, and nothing
    // hinted there were more below: Radix's scrollbar only shows on hover, so never
    // on touch. Hence native scrolling (better touch inertia) + this gradient.
    const listRef = useRef<HTMLDivElement>(null);
    const [canScrollDown, setCanScrollDown] = useState(false);

    const updateScrollHint = () => {
        const el = listRef.current;
        if (!el) return;
        // 8 px margin: avoids leaving the gradient on at the end because of height
        // rounding.
        setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
    };

    useEffect(() => {
        if (!isOpen) return;
        // The list is only mounted when the panel opens: measure once on the first
        // painted frame.
        const frame = requestAnimationFrame(updateScrollHint);
        return () => cancelAnimationFrame(frame);
    }, [isOpen, filteredLinks.length]);

    const getRoleLabel = (role?: string) => {
        switch (role) {
            case "STUDENT": return "Élève";
            case "PILOT": return "Pilote";
            case "OWNER": return "Président";
            case "MANAGER": return "Manager";
            case "ADMIN": return "Administrateur";
            case "INSTRUCTOR": return "Instructeur";
            default: return "Visiteur";
        }
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 lg:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button
                        size="icon"
                        className="h-14 w-14 rounded-full shadow-xl bg-[#774BBE] hover:bg-[#6538a5] text-white transition-transform active:scale-95 relative"
                    >
                        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}

                        {!isOpen && (requestCount > 0 || maintenanceCount > 0 || baptemeCount > 0 || walletAlert) && (
                            <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                        )}

                        <span className="sr-only">Ouvrir le menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] rounded-t-[2rem] p-0 flex flex-col gap-0 border-none bg-white outline-none">

                    <div className="w-full flex justify-center pt-3 pb-1">
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                    </div>

                    {/* Panel header and footer deliberately compact: every pixel saved here is one more visible menu entry. */}
                    <SheetHeader className="px-6 pt-2 pb-4 text-left">
                        {/* Title and description for screen readers only: the panel has no visible header, but Radix requires both to fill aria-labelledby / aria-describedby. */}
                        <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
                        <SheetDescription className="sr-only">
                            Accédez aux différentes pages de l&apos;application et à votre profil.
                        </SheetDescription>

                        <div className="flex items-center gap-3 p-3 bg-slate-50/80 border border-slate-100 rounded-2xl shadow-sm mt-2">
                            <div className="relative shrink-0">
                                <Image
                                    src="/images/profilePicture.png"
                                    alt="Profil"
                                    width={40}
                                    height={40}
                                    className="rounded-full ring-2 ring-white shadow-sm object-cover bg-white"
                                />
                                <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
                            </div>

                            <div className="flex flex-col overflow-hidden">
                                <span className="font-bold text-lg text-slate-800 leading-tight truncate">
                                    {currentUser?.firstName} {currentUser?.lastName}
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    <span className="text-xs font-semibold text-[#774BBE] uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded-full w-fit">
                                        {getRoleLabel(currentUser?.role)}
                                    </span>
                                    {showBalance && wallet.state && (
                                        <Link href={`/wallet?clubID=${currentUser?.clubID}`} onClick={() => setIsOpen(false)}>
                                            <BalancePill balanceCents={wallet.balanceCents as number} state={wallet.state} />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    </SheetHeader>

                    {/* --- ADMIN SECTION: CLUB SELECTOR --- */}
                    {currentUser?.role === userRole.ADMIN && (
                        <div className="px-6 pb-4">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all text-left">
                                        <div className="flex flex-col items-start overflow-hidden">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Club actif</span>
                                            <span className="font-semibold text-slate-800 text-sm truncate w-full">
                                                {clubForAdmin || "Sélectionner"}
                                            </span>
                                        </div>
                                        <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-[260px]">
                                    <DropdownMenuLabel className="text-slate-500">Changer de club</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {clubsProp.map((club) => (
                                        <DropdownMenuItem
                                            key={club.id}
                                            onClick={() => handleClubChange(club.id)}
                                            className="cursor-pointer"
                                        >
                                            {club.id}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}

                    <div className="flex-1 px-4 overflow-hidden flex flex-col">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-3 mb-2">Menu</h3>
                        <div className="relative flex-1 overflow-hidden">
                            <div
                                ref={listRef}
                                onScroll={updateScrollHint}
                                className="h-full space-y-1 overflow-y-auto pb-6"
                            >
                                {filteredLinks.map((item) => {
                                    const badgeCount =
                                        item.name === "Club" || item.name === "Membres"
                                            ? requestCount + baptemeCount
                                            : item.name === "Avions"
                                                ? maintenanceCount
                                                : 0;
                                    const isWalletAlert = item.path === "/wallet" && walletAlert;
                                    const showBadge = badgeCount > 0 || isWalletAlert;

                                    const isActive = pathname === item.path;

                                    return (
                                        <Link
                                            key={item.path}
                                            href={`${item.path}?clubID=${currentUser?.clubID}`}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all active:scale-[0.98] group justify-between",
                                                isActive
                                                    ? "bg-[#774BBE]/10 text-[#774BBE]"
                                                    : "text-slate-600 hover:bg-purple-50 hover:text-[#774BBE]"
                                            )}
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* Compact badge: at the old size, only three entries fit on screen. */}
                                                <span className={cn(
                                                    "p-1.5 rounded-lg transition-all",
                                                    isActive
                                                        ? "bg-white shadow-sm text-[#774BBE]"
                                                        : "bg-slate-50 text-slate-500 group-hover:bg-white group-hover:shadow-sm group-hover:text-[#774BBE]"
                                                )}>
                                                    <item.icon className="h-4 w-4" />
                                                </span>
                                                <span className="text-[15px]">{item.name}</span>
                                            </div>

                                            {showBadge && (
                                                <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-500 px-2 text-xs font-bold text-white shadow-sm">
                                                    {isWalletAlert ? "!" : badgeCount}
                                                </span>
                                            )}
                                        </Link>
                                    )
                                })}
                            </div>

                            {/* "There are more entries below": gradient + chevron, hidden once the bottom of the list is reached. */}
                            {canScrollDown && (
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-12 items-end justify-center bg-gradient-to-t from-white via-white/80 to-transparent">
                                    <ChevronDown className="h-4 w-4 animate-bounce text-slate-400" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 mt-auto pb-6">
                        <button
                            className="flex items-center justify-center w-full gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold shadow-sm active:scale-[0.98] transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-100"
                            onClick={() => signOut()}
                        >
                            <LogOut className="h-4 w-4" />
                            <span>Déconnexion</span>
                        </button>

                        <div className="text-center mt-2 text-[10px] text-slate-400 font-medium">
                            v{packageJson.version} • {packageJson.date}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}

export default NavBar