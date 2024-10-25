/**
 * @file NewSession.js
 * @brief Component for creating a new session button with different display modes.
 * 
 * This component renders a button that allows users to create a new session. 
 * The button's appearance and behavior differ based on the display mode (phone or desktop).
 * The component checks the user's role before rendering, and only admins, owners, and pilots 
 * are allowed to create new sessions.
 */

import React from 'react'
import { IoMdAddCircle } from "react-icons/io";
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { userRole } from '@prisma/client';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '../ui/button';

interface props {
    display: string;  ///< Defines how the button should be displayed ("phone" or "desktop").
    style?: string;   ///< Optional CSS classes for styling the button in phone mode.
}

/**
 * @function NewSession
 * @brief Renders a button for creating a new session.
 * 
 * The `NewSession` component checks the user's role before allowing the creation of a new session.
 * It supports two display modes: phone (icon button) and desktop (text button). The `onClick` function
 * handles the event when the user clicks to create a session.
 * 
 * @param {string} display - Mode of display, either "phone" or "desktop".
 * 
 * @returns  The rendered button or `null` if the user does not have permission.
 */
const NewSession = ({ display }: props) => {
    const { currentUser } = useCurrentUser();

    // Only render the button if the user is an admin, owner, or pilot.
    if (!(currentUser?.role.includes(userRole.ADMIN) || currentUser?.role.includes(userRole.OWNER) || currentUser?.role.includes(userRole.PILOT))) {
        return null;
    }


    return (
        <Dialog>
            <DialogTrigger className={`${display === "desktop" ? "bg-[#774BBE] hover:bg-[#3d2365] text-white" : "bg-white"} rounded-md px-2 font-medium`}>
                {display === "desktop" ? (
                    <p>Nouvelle session</p>
                ) : (
                    <IoMdAddCircle size={27} color='#774BBE' />
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nouvelle session</DialogTitle>
                    <DialogDescription>
                        Configuration de la nouvelle session
                    </DialogDescription>
                </DialogHeader>
                ttttt
                <DialogFooter>
                    <DialogClose>Cancel</DialogClose>
                    <Button>Enregistrer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    );
}


export default NewSession
