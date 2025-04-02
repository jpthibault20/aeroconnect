"use client"

import { useCurrentUser } from '@/app/context/useCurrentUser'
import { navigationLinks } from '@/config/links'
import { userRole } from '@prisma/client'
import React from 'react'
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
    const [isOpen, setIsOpen] = React.useState(false)

    const filteredLinks = navigationLinks.filter(link =>
        link.roles.includes(currentUser?.role as userRole)
    )
    return (
        <div className="fixed bottom-4 right-4 z-50 lg:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button
                        size="icon"
                        className="h-14 w-14 rounded-full shadow-lg bg-[#774BBE]"
                    >
                        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        <span className="sr-only">Ouvrir le menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-fit rounded-t-3xl">
                    <SheetHeader>
                        <SheetTitle></SheetTitle>
                    </SheetHeader>
                    <div
                        className="p-1 flex items-center rounded-lg bg-gray-200 border border-gray-300 shadow-lg my-6"
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
                                            : currentUser?.role === "MANAGER"
                                                ? "Manager"
                                                : currentUser?.role === "ADMIN"
                                                    ? "Administrateur"
                                                    : "Visiteur"
                                }
                            </p>
                        </div>
                    </div>
                    <nav className="flex flex-col space-y-4">
                        <ScrollArea className="h-[50vh] w-full">
                            {filteredLinks.map((item) => (
                                <Link
                                    key={item.path}
                                    href={`${item.path}?clubID=${currentUser?.clubID}`}
                                    className="flex items-center space-x-4 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <item.icon className="h-6 w-6" />
                                    <span className="text-lg font-medium">{item.name}</span>
                                </Link>
                            ))}
                        </ScrollArea>

                        <div className="text-center text-xs text-gray-500 mb-1">
                            version : {packageJson.version} - {packageJson.date}
                        </div>

                        <div className="border-1 border-b border-[#797979] mx-3 mb-6" />

                        <button
                            className="flex items-center space-x-4 px-4 pb-7 rounded-lg hover:bg-gray-100 transition-colors"
                            onClick={() => signOut()}
                        >
                            <LogOut className="h-6 w-6" />
                            <span className="text-lg font-medium">Déconnexion</span>
                        </button>
                    </nav>
                </SheetContent>
            </Sheet>
        </div>
    )
}

export default NavBar

