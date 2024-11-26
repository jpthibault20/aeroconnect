"use client"
import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { navigationLinks } from '@/config/links'
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/auth/login/action'
import { useCurrentUser } from '@/app/context/useCurrentUser'
import { userRole } from '@prisma/client'

const SideBar = () => {
    const pathname = usePathname();
    const { currentUser } = useCurrentUser();
    const [disabled, setDisabled] = useState(false);

    const logout = () => {
        setDisabled(true);
        signOut()
    }

    return (
        <aside className="hidden lg:flex w-64 h-screen bg-[#212121] text-white flex-col">
            <Link href="/" className="p-4 flex items-center">
                <Image
                    src="/images/Logo_title.svg"
                    alt="Aero Connect"
                    width={150}
                    height={40}
                    className="w-150 h-auto"
                    priority={true}
                />
            </Link>

            <div className='border-1 border-b border-[#797979] mx-3 mb-6' />

            <Link className="bg-[#9BAAD1] p-1 mb-4 flex items-center mx-3 rounded-lg" href={'/profile'}>
                <Image src="/images/profilePicture.png" alt="User" width={40} height={40} className="rounded-full mr-3" />
                <div className='w-full'>
                    <p className="border-b font-medium text-sm w-fit">{currentUser?.lastName} {currentUser?.firstName}</p>
                    <p className="text-sm ">   {currentUser?.role === 'STUDENT' ? 'Élève' :
                        currentUser?.role === "PILOT" ? 'Pilote' :
                            currentUser?.role === 'OWNER' ? 'Gérant' :
                                currentUser?.role === 'USER' ? 'visiteur' :
                                    currentUser?.role}</p>
                </div>
            </Link>

            <nav className="flex-1">
                {navigationLinks
                    .filter(link => link.roles.includes(currentUser?.role as userRole))
                    .map((link) => {
                        const IconComponent = link.icon
                        return (
                            <Link key={link.name} href={`${link.path}?clubID=${currentUser?.clubID}`} className={`flex items-center px-4 py-4 mx-3 ${pathname === link.path ? 'rounded-full bg-[#3E3E3E] text-white' : 'text-[#C2C2C2] hover:text-white'}`}>
                                <IconComponent className="mr-3" size={25} />
                                {link.name}
                            </Link>
                        )
                    })}
            </nav>

            <div className='border-1 border-b border-[#797979] mx-3 mb-6' />

            <button className={`flex items-center px-4 py-2 hover:bg-slate-800 mt-auto mb-4  ${disabled ? 'text-slate-500' : 'text-white'}`} onClick={logout}>
                <LogOut className="mr-3" size={20} />
                Déconnexion
            </button>
        </aside>
    )
}

export default SideBar
