"use client"
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { navigationLinks } from '@/config/links';
import { userRole } from '@prisma/client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react'

const NavBar = () => {
    const pathname = usePathname();
    const { currentUser } = useCurrentUser();

    return (
        <nav className="lg:hidden fixed bottom-4 left-0 right-0 flex justify-center">
            <div className="bg-gray-900 flex items-center justify-around w-5/6 h-14 rounded-full shadow-lg">
                {navigationLinks
                    .filter(link => link.roles.includes(currentUser?.role as userRole))
                    .map((link) => {
                        const IconComponent = link.icon
                        return (
                            <Link key={link.name} href={link.path} className={`flex items-center justify-center p-3 rounded-full ${pathname === link.path ? 'bg-purple-500' : ''}`}>
                                <div className={`text-gray-300 ${pathname === link.path ? 'text-white' : 'text-gray-400'}`}>
                                    <IconComponent className="mx-1" size={25} />
                                </div>
                            </Link>
                        )
                    })}
            </div>
        </nav>
    )
}

export default NavBar
