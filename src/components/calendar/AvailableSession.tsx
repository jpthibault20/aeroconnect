// AvailableSession.tsx

import { memo } from "react";

interface AvailableSessionProps {
    availablePlanes: string[];
    availablePilots: string[];
}

const AvailableSession = memo(function AvailableSession({ availablePilots, availablePlanes }: AvailableSessionProps) {

    return (
        <div className="text-xs font-semibold space-y-1 text-black">
            <p>
                {availablePilots.length} {availablePilots.length > 1 ? 'Instructeurs libres' : 'Instructeur libre'}
            </p>
            <p>
                {availablePlanes.length} {availablePlanes.length > 1 ? 'Appareils libres' : 'Appareil libre'}
            </p>
        </div>
    );
});

export default AvailableSession;
