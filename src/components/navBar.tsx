"use client"

import { useCurrentUser } from '@/app/context/useCurrentUser'
import { navigationLinks } from '@/config/links'
import { userRole } from '@prisma/client'
import React, { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet'
import { Button } from './ui/button'
import { LogOut, Menu, X } from 'lucide-react'
import { signOut } from '@/app/auth/login/action'
import Link from 'next/link'
import Image from 'next/image'
import packageJson from "../../package.json";
import { ScrollArea } from "@/components/ui/scroll-area"
import { getAllUserRequestedClubID } from "@/api/db/club";
import { usePathname, useSearchParams } from 'next/navigation' // 1. Import du hook pour l'URL active
import { cn } from '@/lib/utils' // 2. Import de cn pour gérer les classes conditionnelles

const NavBar = () => {
    const { currentUser } = useCurrentUser()
    const [isOpen, setIsOpen] = useState(false)
    const [requestCount, setRequestCount] = useState(0);
    const pathname = usePathname(); // 3. Récupération du chemin actuel
    const [refreshTrigger, setRefreshTrigger] = React.useState(0);
    const searchParams = useSearchParams();
    const clubID = searchParams.get("clubID");

    // --- EFFECT: Récupérer les notifications ---
    useEffect(() => {
        const fetchRequests = async () => {
            // Définition explicite des rôles pour TypeScript
            const allowedRoles: userRole[] = [userRole.ADMIN, userRole.OWNER, userRole.MANAGER];

            // Vérification si l'utilisateur a le droit de voir les demandes
            const canManage = currentUser?.role && allowedRoles.includes(currentUser.role);

            if (clubID && canManage) {
                try {
                    const requests = await getAllUserRequestedClubID(clubID);
                    // Mise à jour du compteur si la réponse est un tableau
                    if (Array.isArray(requests)) {
                        setRequestCount(requests.length);
                    }
                } catch (error) {
                    console.error("Erreur lors du chargement des notifications:", error);
                }
            }
        };

        // Appel immédiat au chargement du composant
        fetchRequests();

        // --- GESTION DE L'AUTO-REFRESH ---

        // Fonction qui sera appelée quand l'événement est déclenché
        const handleRefresh = () => {
            // On incrémente ce compteur, ce qui modifie une dépendance du useEffect
            // et force React à relancer 'fetchRequests()'
            setRefreshTrigger((prev) => prev + 1);
        };

        // On écoute l'événement global personnalisé
        window.addEventListener('refresh-club-requests', handleRefresh);

        // Fonction de nettoyage (très important pour éviter les fuites de mémoire)
        return () => {
            window.removeEventListener('refresh-club-requests', handleRefresh);
        };

    }, [clubID, currentUser, refreshTrigger]);

    const filteredLinks = navigationLinks.filter(link =>
        link.roles.includes(currentUser?.role as userRole)
    )

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

                        {!isOpen && requestCount > 0 && (
                            <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                        )}

                        <span className="sr-only">Ouvrir le menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] rounded-t-[2rem] p-0 flex flex-col gap-0 border-none bg-white outline-none">

                    <div className="w-full flex justify-center pt-3 pb-1">
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                    </div>

                    <SheetHeader className="px-6 pt-2 pb-6 text-left">
                        <SheetTitle className="sr-only">Menu de navigation</SheetTitle>

                        <div className="flex items-center gap-4 p-4 bg-slate-50/80 border border-slate-100 rounded-2xl shadow-sm mt-2">
                            <div className="relative shrink-0">
                                <Image
                                    src="/images/profilePicture.png"
                                    alt="Profil"
                                    width={48}
                                    height={48}
                                    className="rounded-full ring-2 ring-white shadow-sm object-cover bg-white"
                                />
                                <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
                            </div>

                            <div className="flex flex-col overflow-hidden">
                                <span className="font-bold text-lg text-slate-800 leading-tight truncate">
                                    {currentUser?.firstName} {currentUser?.lastName}
                                </span>
                                <span className="text-xs font-semibold text-[#774BBE] uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded-full w-fit mt-1">
                                    {getRoleLabel(currentUser?.role)}
                                </span>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="flex-1 px-4 overflow-hidden flex flex-col">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-4 mb-2">Menu</h3>
                        <ScrollArea className="flex-1 pr-2 -mr-2">
                            <div className="space-y-1 pb-4">
                                {filteredLinks.map((item) => {
                                    const showBadge = (item.name === "Membres" || item.name === "Club") && requestCount > 0;

                                    // 4. Déterminer si le lien est actif
                                    const isActive = pathname === item.path;

                                    return (
                                        <Link
                                            key={item.path}
                                            href={`${item.path}?clubID=${currentUser?.clubID}`}
                                            // 5. Application des styles conditionnels
                                            className={cn(
                                                "flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium transition-all active:scale-[0.98] group justify-between",
                                                isActive
                                                    ? "bg-[#774BBE]/10 text-[#774BBE]" // Style Actif : Fond violet très clair + texte violet
                                                    : "text-slate-600 hover:bg-purple-50 hover:text-[#774BBE]" // Style Inactif
                                            )}
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className={cn(
                                                    "p-2 rounded-lg transition-all",
                                                    isActive
                                                        ? "bg-white shadow-sm text-[#774BBE]" // Icône Active : Fond blanc + icône violette
                                                        : "bg-slate-50 text-slate-500 group-hover:bg-white group-hover:shadow-sm group-hover:text-[#774BBE]"
                                                )}>
                                                    <item.icon className="h-5 w-5" />
                                                </span>
                                                <span className="text-base">{item.name}</span>
                                            </div>

                                            {showBadge && (
                                                <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-500 px-2 text-xs font-bold text-white shadow-sm">
                                                    {requestCount}
                                                </span>
                                            )}
                                        </Link>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="p-6 border-t border-slate-100 bg-slate-50/50 mt-auto pb-8">
                        <button
                            className="flex items-center justify-center w-full gap-2 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold shadow-sm active:scale-[0.98] transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-100"
                            onClick={() => signOut()}
                        >
                            <LogOut className="h-5 w-5" />
                            <span>Déconnexion</span>
                        </button>

                        <div className="text-center mt-4 text-[10px] text-slate-400 font-medium">
                            v{packageJson.version} • {packageJson.date}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}

export default NavBar