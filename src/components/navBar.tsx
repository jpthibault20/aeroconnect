"use client"

import { useCurrentUser } from '@/app/context/useCurrentUser'
import { navigationLinks } from '@/config/links'
import { userRole } from '@prisma/client'
import React, { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet'
import { Button } from './ui/button'
import { LogOut, Menu, X } from 'lucide-react'
import { signOut } from '@/app/auth/login/action'
import Link from 'next/link'
import Image from 'next/image'
import packageJson from "../../package.json";
import { ScrollArea } from "@/components/ui/scroll-area"

const NavBar = () => {
    const { currentUser } = useCurrentUser()
    const [isOpen, setIsOpen] = useState(false)

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
            default: return "Visiteur";
        }
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 lg:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button
                        size="icon"
                        className="h-14 w-14 rounded-full shadow-xl bg-[#774BBE] hover:bg-[#6538a5] text-white transition-transform active:scale-95"
                    >
                        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        <span className="sr-only">Ouvrir le menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] rounded-t-[2rem] p-0 flex flex-col gap-0 border-none bg-white outline-none">

                    {/* Poignée visuelle pour indiquer le slide */}
                    <div className="w-full flex justify-center pt-3 pb-1">
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                    </div>

                    <SheetHeader className="px-6 pt-2 pb-6 text-left">
                        <SheetTitle className="sr-only">Menu de navigation</SheetTitle>

                        {/* Carte Profil */}
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

                    {/* Navigation Links */}
                    <div className="flex-1 px-4 overflow-hidden flex flex-col">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-4 mb-2">Menu</h3>
                        <ScrollArea className="flex-1 pr-2 -mr-2">
                            <div className="space-y-1 pb-4">
                                {filteredLinks.map((item) => (
                                    <Link
                                        key={item.path}
                                        href={`${item.path}?clubID=${currentUser?.clubID}`}
                                        className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-slate-600 font-medium transition-all active:scale-[0.98] hover:bg-purple-50 hover:text-[#774BBE] group"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <span className="p-2 bg-slate-50 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all text-slate-500 group-hover:text-[#774BBE]">
                                            <item.icon className="h-5 w-5" />
                                        </span>
                                        <span className="text-base">{item.name}</span>
                                    </Link>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Footer / Logout */}
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