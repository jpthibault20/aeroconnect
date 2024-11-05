// BookedSession.tsx
import { flight_sessions } from '@prisma/client';

interface BookedSessionProps {
    sessions: flight_sessions[]; // Liste des sessions réservées pour ce créneau
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BookedSession = ({ sessions }: BookedSessionProps) => {
    return (
        <div className="text-s font-istok font-semibold">
            <p>Complet</p>
        </div>
    );
};

export default BookedSession;
