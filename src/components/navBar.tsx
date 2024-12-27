"use client"

import { useCurrentUser } from '@/app/context/useCurrentUser'
import { navigationLinks } from '@/config/links'
import { Club, userRole } from '@prisma/client'
import React from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet'
import { Button } from './ui/button'
import { ChevronDown, LogOut, Menu, X } from 'lucide-react'
import { signOut } from '@/app/auth/login/action'
import Link from 'next/link'
import Image from 'next/image'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'
import { updateUserClub } from '@/api/db/users'
import { useSearchParams } from 'next/navigation'

interface props {
    clubsProp: Club[]
}
const NavBar = ({ clubsProp }: props) => {
    const { currentUser } = useCurrentUser()
    const searchParams = useSearchParams();
    const clubID = searchParams.get("clubID");
    const [isOpen, setIsOpen] = React.useState(false)
    const [clubForAdmin, setClubForAdmin] = React.useState<string | null>(clubID);

    const handleClubChange = async (clubID: string) => {
        setClubForAdmin(clubID);

        if (currentUser?.id) {
            await updateUserClub(currentUser.id, clubID);
            window.location.href = `/calendar?clubID=${clubID}`;
        }

    };


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
                        <div className="">
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
                        {currentUser?.role === userRole.ADMIN &&
                            <div className='flex flex-1 justify-center items-center'>
                                <div className='bg-white border-gray-400 rounded-lg px-2 py-1 text-black'>
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
                    </div>
                    <nav className="flex flex-col space-y-4">
                        {filteredLinks.map((item) => (
                            <Link
                                key={item.path}
                                href={`${item.path}?clubID=${currentUser?.clubID}`}
                                className="flex items-center space-x-2 px-4 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                                onClick={() => setIsOpen(false)}
                            >
                                <item.icon className="h-5 w-5" />
                                <span className="text-md font-medium">{item.name}</span>
                            </Link>
                        ))}
                        <button
                            className="flex items-center space-x-2 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors"
                            onClick={() => signOut()}
                        >
                            <LogOut className="h-5 w-5" />
                            <span className="text-md font-medium">Déconnexion</span>
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

