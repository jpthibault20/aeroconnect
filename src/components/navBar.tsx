"use client"

import { useCurrentUser } from '@/app/context/useCurrentUser'
import { navigationLinks } from '@/config/links'
import { userRole } from '@prisma/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

const NavBar = () => {
    const pathname = usePathname()
    const { currentUser } = useCurrentUser()

    const filteredLinks = navigationLinks.filter(link =>
        link.roles.includes(currentUser?.role as userRole)
    )

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
            <div className="container mx-auto px-4">
                <div className="bg-gray-900 flex items-center justify-around rounded-t-xl lg:rounded-b-xl shadow-lg">
                    {filteredLinks.map((link) => {
                        const IconComponent = link.icon
                        const isActive = pathname === link.path
                        return (
                            <Link
                                key={link.name}
                                href={`${link.path}?clubID=${currentUser?.clubID}`}
                                className={`flex flex-col items-center justify-center p-3 rounded-t-xl transition-colors duration-200 ease-in-out
                                    ${isActive ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-gray-200'}
                                    ${filteredLinks.length > 5 ? 'text-xs' : 'text-sm'}
                                    lg:flex-row lg:px-4 lg:py-2`
                                }
                            >
                                <IconComponent className={`mx-1 ${filteredLinks.length > 5 ? 'w-5 h-5' : 'w-6 h-6'}`} />
                                <span className="hidden lg:inline ml-2">{link.name}</span>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </nav>
    )
}

export default NavBar

