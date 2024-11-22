import React from 'react';
import AvailableSession from './AvailableSession';
import BookedSession from './BookedSession';
import SessionPopup from './SessionPopup';
import { flight_sessions } from '@prisma/client';

interface Props {
    sessions: flight_sessions[];
    reload: boolean;
    setReload: React.Dispatch<React.SetStateAction<boolean>>;
}

const Session = ({ sessions, reload, setReload }: Props) => {
    // Sépare les sessions réservées et disponibles
    const availableSessions = sessions.filter(session => session.studentID === null);
    const bookedSessions = sessions.filter(session => session.studentID !== null);

    const availablePlanes = new Set<string>();
    const availablePilots = new Set<string>();

    availableSessions.forEach(session => {
        session.planeID.forEach(plane => availablePlanes.add(plane));
        availablePilots.add(session.pilotFirstName);
    });

    const endSessionDate = new Date(
        sessions[0].sessionDateStart.getFullYear(),
        sessions[0].sessionDateStart.getMonth(),
        sessions[0].sessionDateStart.getDate(),
        sessions[0].sessionDateStart.getHours(),
        sessions[0].sessionDateStart.getMinutes() + sessions[0].sessionDateDuration_min,
        0
    );

    if ([...bookedSessions, ...availableSessions].length === 0) return null;


    return (
        <SessionPopup sessions={[...bookedSessions, ...availableSessions]} setReload={setReload} reload={reload}>
            <div
                className={`p-1 rounded-md flex flex-col h-full w-full ${availableSessions.length === 0 ? 'bg-[#CB8A8A] opacity-50' : 'bg-[#B9DFC1]'}`}
            >
                <div className='w-full items-end'>
                    <p className="text-xs text-[#646464] text-end">
                        {sessions[0].sessionDateStart.getUTCHours().toString().padStart(2, '0')}:
                        {sessions[0].sessionDateStart.getUTCMinutes().toString().padStart(2, '0')} -
                        {endSessionDate.getUTCHours().toString().padStart(2, '0')}:
                        {endSessionDate.getUTCMinutes().toString().padStart(2, '0')}
                    </p>
                </div>
                <div className='w-full h-full flex items-center'>
                    {availableSessions.length === 0 ? (
                        <BookedSession sessions={bookedSessions} />
                    ) : (
                        <AvailableSession
                            availablePlanes={Array.from(availablePlanes)}
                            availablePilots={Array.from(availablePilots)}
                        />
                    )}
                </div>
            </div>
        </SessionPopup>
    );
};

export default Session;
