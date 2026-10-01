"use client";

import React from 'react'
import SideBar from './sideBar'
import NavBar from './navBar'
import { Club } from '@prisma/client'
import { useNavigationCounts } from '@/hooks/useNavigationCounts'

interface props {
    children: React.ReactNode
    clubsProp: Club[]
}
const Navigation = ({ children, clubsProp }: props) => {
    // Counters shared by both bars: a single set of server calls.
    const counts = useNavigationCounts();

    return (
        <div className='flex h-full '>
            <SideBar clubsProp={clubsProp} counts={counts} />

            <div className='flex-1 h-full w-full'>
                {children}
            </div>

            <NavBar clubsProp={clubsProp} counts={counts} />
        </div>
    )
}

export default Navigation
