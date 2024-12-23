import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { planes } from '@prisma/client';

interface PlaneSelectProps {
    planes: planes[];
    selectedPlane: string;
    onPlaneChange: (plane: string) => void;
    classroomSession: boolean;
}

const PlaneSelect = ({ planes, selectedPlane, onPlaneChange, classroomSession }: PlaneSelectProps) => {
    return (
        <div>
            <Label>Appareils</Label>
            <Select value={selectedPlane} onValueChange={onPlaneChange}>
                <SelectTrigger>
                    <SelectValue placeholder="Appareilss" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="nothing">Appareils</SelectItem>
                    {planes.map(item => (
                        <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                    {classroomSession && <SelectItem value="classroomSession">Session théorique</SelectItem>}
                </SelectContent>
            </Select>
        </div>)
};

export default PlaneSelect;
