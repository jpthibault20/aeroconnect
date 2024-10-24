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
import { Button } from '../ui/button';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { userRole } from '@prisma/client';

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
 * @param {string} style - Optional additional CSS classes for phone mode button styling.
 * 
 * @returns {JSX.Element|null} The rendered button or `null` if the user does not have permission.
 */
const NewSession = ({ display, style }: props) => {
    const { currentUser } = useCurrentUser();

    /**
     * @function onClick
     * @brief Handles the click event to create a new session.
     */
    const onClick = () => {
        console.log("~ new session ~")
    }

    // Only render the button if the user is an admin, owner, or pilot.
    if (!(currentUser?.role.includes(userRole.ADMIN) || currentUser?.role.includes(userRole.OWNER) || currentUser?.role.includes(userRole.PILOT))) {
        return null;
    }

    // Display for phone: icon button
    if (display === "phone") {
        return (
            <button
                className={`${style}`}
                onClick={onClick}
            >
                <IoMdAddCircle size={27} color='#774BBE' />
            </button>
        );
    }
    // Display for desktop: text button
    else if (display === "desktop") {
        return (
            <Button
                className='bg-[#774BBE] hover:bg-[#3d2365]'
                onClick={onClick}
            >
                Nouvelle session
            </Button>
        );
    }
}

export default NewSession
