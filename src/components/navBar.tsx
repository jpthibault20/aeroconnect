"use client"

import { useCurrentUser } from '@/app/context/useCurrentUser'
import { navigationLinks } from '@/config/links'
import { userRole } from '@prisma/client'
import React from 'react'
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet'
import { Button } from './ui/button'
import { LogOut, Menu, X } from 'lucide-react'
import { signOut } from '@/app/auth/login/action'
import Link from 'next/link'

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
                    <nav className="flex flex-col space-y-4 mt-8">
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
                        <button
                            className="flex items-center space-x-4 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors"
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

    // return (
    //     <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
    //         <div className="container mx-auto px-4">
    //             <div className="bg-gray-900 flex items-center justify-around rounded-t-xl lg:rounded-b-xl shadow-lg">
    //                 {filteredLinks.map((link) => {
    //                     const IconComponent = link.icon
    //                     const isActive = pathname === link.path
    //                     return (
    //                         <Link
    //                             key={link.name}
    //                             href={`${link.path}?clubID=${currentUser?.clubID}`}
    //                             className={`flex flex-col items-center justify-center p-3 rounded-t-xl transition-colors duration-200 ease-in-out
    //                                 ${isActive ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-gray-200'}
    //                                 ${filteredLinks.length > 5 ? 'text-xs' : 'text-sm'}
    //                                 lg:flex-row lg:px-4 lg:py-2`
    //                             }
    //                         >
    //                             <IconComponent className={`mx-1 ${filteredLinks.length > 5 ? 'w-5 h-5' : 'w-6 h-6'}`} />
    //                             <span className="hidden lg:inline ml-2">{link.name}</span>
    //                         </Link>
    //                     )
    //                 })}
    //             </div>
    //         </div>
    //     </nav>
    // )
}

export default NavBar

