// BookedSession.tsx
import { flight_sessions } from '@prisma/client';
import { memo } from 'react';

interface BookedSessionProps {
    sessions: flight_sessions[]; // Liste des sessions réservées pour ce créneau
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BookedSession = memo(function BookedSession({ sessions }: BookedSessionProps) {
    return (
        <div className="text-s font-istok font-semibold text-purple-800">
            <p>Complet</p>
        </div>
    );
});

export default BookedSession;
