import React from 'react'
import SideBar from './sideBar'
import NavBar from './navBar'
import { Club } from '@prisma/client'

interface props {
    children: React.ReactNode
    clubsProp: Club[]
}
const Navigation = ({ children, clubsProp }: props) => {
    return (
        <div className='flex h-full '>
            <SideBar clubsProp={clubsProp} />

            <div className='flex-1 h-full w-full'>
                {children}
            </div>

            <NavBar />
        </div>
    )
}

export default Navigation
