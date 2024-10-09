import React from 'react'
import SideBar from './sideBar'
import NavBar from './navBar'

interface props {
    children: React.ReactNode
}
const Navigation = ({ children }: props) => {
    return (
        <div className='flex h-screen'>
            <SideBar />

            <main className='flex-1 h-full w-full'>
                {children}
            </main>

            <NavBar />
        </div>
    )
}

export default Navigation
