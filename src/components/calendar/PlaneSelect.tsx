import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { planes } from '@prisma/client';

interface PlaneSelectProps {
    planes: planes[];
    selectedPlane: string;
    onPlaneChange: (plane: string) => void;
}

const PlaneSelect = ({ planes, selectedPlane, onPlaneChange }: PlaneSelectProps) => (
    <div>
        <Label>Avion</Label>
        <Select value={selectedPlane} onValueChange={onPlaneChange}>
            <SelectTrigger>
                <SelectValue placeholder="Avions" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="nothing">Avions</SelectItem>
                {planes.map(item => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    </div>
);

export default PlaneSelect;
