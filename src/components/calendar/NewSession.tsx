import React from 'react'
import { IoMdAddCircle } from "react-icons/io";
import { Button } from '../ui/button';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { userRole } from '@prisma/client';

interface props {
    display: string
    style?: string
}

const NewSession = ({ display, style }: props) => {
    const { currentUser } = useCurrentUser();

    const onClick = () => {
        console.log("~ new session ~")
    }

    if (!(currentUser?.role.includes(userRole.ADMIN) || currentUser?.role.includes(userRole.OWNER) || currentUser?.role.includes(userRole.PILOT))) {
        return null
    }

    if (display === "phone") {
        return (
            <button
                className={`${style}`}
                onClick={onClick}
            >
                <IoMdAddCircle size={27} color='#774BBE' />
            </button>
        )
    }
    else if (display === "desktop") {
        return (
            <Button
                className='bg-[#774BBE] hover:bg-[#3d2365]'
                onClick={onClick}
            >
                Nouvelle session
            </Button>
        )
    }
}

export default NewSession
