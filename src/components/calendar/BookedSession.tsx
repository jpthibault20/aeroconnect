// BookedSession.tsx
import { flight_sessions } from '@prisma/client';

interface BookedSessionProps {
    sessions: flight_sessions[]; // Liste des sessions réservées pour ce créneau
}

const BookedSession = ({ sessions }: BookedSessionProps) => {
    return (
        <div className="text-s font-istok font-semibold">
            <p>Complet</p>
            <p>{sessions.length} sessions réservées</p>
        </div>
    );
};

export default BookedSession;
