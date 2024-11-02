import React from 'react'
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { flight_sessions } from '@prisma/client';

interface prop {
    sessions: flight_sessions[];
}

const SessionPopup = ({ sessions }: prop) => {


    // Function to format the session date
    const formatDate = (dateString: Date) => {
        const day = dateString.getUTCDate();
        const month = dateString.getUTCMonth() + 1;
        const year = dateString.getUTCFullYear();
        const hour = dateString.getUTCHours();
        const minute = dateString.getUTCMinutes();
        const second = dateString.getUTCSeconds();

        const formattedDate = `${day}/${month}/${year} ${hour}:${minute === 0 ? '00' : minute}:${second === 0 ? '00' : second}`;
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
