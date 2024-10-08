import React from 'react'
import SideBar from './sideBar'
import NavBar from './navBar'

interface props {
    children: React.ReactNode
}
const Navigation = ({ children }: props) => {
    return (
        <div className='flex'>
            <SideBar />

            <main>
                {children}
            </main>

            <NavBar />
        </div>
    )
}

export default Navigation
