import React, { useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { User } from '@prisma/client';

interface InstructorSelectProps {
    instructors: User[];
    selectedInstructor: string;
    onInstructorChange: (instructor: string) => void;
}

const InstructorSelect = ({ instructors, selectedInstructor, onInstructorChange }: InstructorSelectProps) => {
    useEffect(() => {
        // Si un seul instructeur est disponible, le sélectionner par défaut
        if (instructors.length === 1) {
            onInstructorChange(instructors[0].id);
        }
    }, [instructors, onInstructorChange]);

    return (
        <div>
            <Label>Instructeur</Label>
            <Select
                value={selectedInstructor}
                onValueChange={onInstructorChange}
            >
                <SelectTrigger>
                    <SelectValue placeholder="Instructeurs" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="nothing">Instructeurs</SelectItem>
                    {instructors.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                            {`${item.lastName.charAt(0)}.${item.firstName}`}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};

export default InstructorSelect;
