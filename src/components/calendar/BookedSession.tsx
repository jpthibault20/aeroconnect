// BookedSession.tsx
import { flight_sessions } from '@prisma/client';
import { memo } from 'react';

interface BookedSessionProps {
    sessions: flight_sessions[]; // Liste des sessions réservées pour ce créneau
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BookedSession = memo(function BookedSession({ sessions }: BookedSessionProps) {
    console.log("BookedSession | Rendering...");
    return (
        <div className="text-s font-istok font-semibold">
            <p>Complet</p>
        </div>
    );
});

export default BookedSession;
