// AvailableSession.tsx

interface AvailableSessionProps {
    availablePlanes: string[];
    availablePilots: string[];
}

const AvailableSession = ({ availablePlanes, availablePilots }: AvailableSessionProps) => {
    return (
        <div className="text-xs space-y-1">
            <p>
                {availablePlanes.length} {availablePlanes.length > 1 ? 'Avions libres' : 'Avion libre'}
            </p>
            <p>
                {availablePilots.length} {availablePilots.length > 1 ? 'Instructeurs libres' : 'Instructeur libre'}
            </p>
        </div>
    );
};

export default AvailableSession;
