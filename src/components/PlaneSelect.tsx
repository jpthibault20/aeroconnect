import React, { useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { planes } from '@prisma/client';
import { useCurrentUser } from '@/app/context/useCurrentUser';

interface PlaneSelectProps {
    planes: planes[];
    selectedPlane: string;
    onPlaneChange: (plane: string) => void;
}

const PlaneSelect = ({ planes, selectedPlane, onPlaneChange, }: PlaneSelectProps) => {
    const { currentUser } = useCurrentUser();
    useEffect(() => {
        // Si un seul avion est disponible, le sélectionner par défaut
        if (planes.length === 1) {
            onPlaneChange(planes[0].id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div>
            <Label>Appareils</Label>
            <Select
                value={selectedPlane}
                onValueChange={onPlaneChange}
            >
                <SelectTrigger>
                    <SelectValue placeholder="Appareils" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="nothing">Appareils</SelectItem>
                    {planes.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                            {item.name}
                        </SelectItem>
                    ))}
                    {currentUser?.canSubscribeWithoutPlan && (
                        <SelectItem value="noPlane">
                            Sans avion
                        </SelectItem>
                    )}
                </SelectContent>
            </Select>
        </div>
    );
};

export default PlaneSelect;
