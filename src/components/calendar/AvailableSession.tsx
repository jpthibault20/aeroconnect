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
                {availablePlanes.length} {availablePlanes.length > 1 ? 'Avions libres' : 'Avion libre'}
            </p>
            <p>
                {availablePilots.length} {availablePilots.length > 1 ? 'Instructeurs libres' : 'Instructeur libre'}
            </p>
        </div>
    );
});

export default AvailableSession;
