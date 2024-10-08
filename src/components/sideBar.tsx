import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { navigationLinks } from '@/config/links'
import { usePathname } from 'next/navigation';

const SideBar = () => {
    const pathname = usePathname();

    return (
        <aside className="hidden lg:flex w-60 h-screen bg-[#212121] text-white flex-col">
            <Link href={"/"} className="p-4">
                <Image src="/images/Logo_title.svg" alt="Aero Connect" width={150} height={40} />
            </Link>

            <div className='border-1 border-b border-[#797979] mx-3 mb-6' />

            <div className="bg-[#9BAAD1] p-1 mb-4 flex items-center mx-3 rounded-lg">
                <Image src="/images/profilePicture.png" alt="User" width={40} height={40} className="rounded-full mr-3" />
                <div className='w-full'>
                    <p className="font-semibold">Alex Doe</p>
                    <p className='border-b border-2 w-2/3' />
                    <p className="text-sm ">Pilot</p>
                </div>
            </div>

            <nav className="flex-1">
                {navigationLinks.map((link) => {
                    const IconComponent = link.icon
                    return (
                        <Link key={link.name} href={link.path} className={`flex items-center px-4 py-4 mx-3 ${pathname === link.path ? 'rounded-full bg-[#3E3E3E] text-white' : 'text-[#C2C2C2] hover:text-white'}`}>
                            <IconComponent className="mr-3" size={25} />
                            {link.name}
                        </Link>
                    )
                })}
            </nav>

            <button className="flex items-center px-4 py-2 hover:bg-slate-800 mt-auto mb-4">
                <LogOut className="mr-3" size={20} />
                Déconnexion
            </button>
        </aside>
    )
}

export default SideBar
