import React from 'react'
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { flight_sessions } from '@prisma/client';

interface prop {
    sessions: flight_sessions[];
}

const SessionPopup = ({ sessions }: prop) => {


    // Function to format the session date
    const formatDate = (dateString: Date) => {
        const date = new Date(dateString); // Convert to Date object

        // Format date and time separately
        const formattedDate = date.toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); // French format

        return `${formattedDate} `; // Combine
    };

    return (

        <DialogContent>
            <DialogHeader>
                <DialogTitle>Détails de la session</DialogTitle>
                <DialogDescription className='flex flex-col'>
                    Session du {formatDate(sessions[0].sessionDateStart)}
                </DialogDescription>
            </DialogHeader>
            {sessions.map((session, index) => (
                <p key={index}>
                    {session.id}
                </p>
            ))}
        </DialogContent>
    )
}

export default SessionPopup
