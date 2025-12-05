import React, { useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { User } from '@prisma/client';

interface InstructorSelectProps {
    instructors: User[];
    selectedInstructor: string;
    onInstructorChange: (instructor: string) => void;
}

const InstructorSelect = ({ instructors, selectedInstructor, onInstructorChange }: InstructorSelectProps) => {

    // Auto-sélection s'il n'y a qu'un seul choix
    useEffect(() => {
        if (instructors.length === 1) {
            onInstructorChange(instructors[0].id);
        }
    }, [instructors, onInstructorChange]);

    return (
        <Select
            value={selectedInstructor}
            onValueChange={onInstructorChange}
        >
            <SelectTrigger className="w-full bg-slate-50 border-slate-200 text-slate-700 focus:ring-[#774BBE] focus:ring-offset-0">
                <SelectValue placeholder="Sélectionner un instructeur" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="nothing" className="text-slate-400 italic">
                    -- Choisir --
                </SelectItem>
                {instructors.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                        {/* Format : NOM Prénom */}
                        <span className="font-semibold text-slate-700">{item.lastName.toUpperCase()}</span>
                        <span className="text-slate-600 ml-1">{item.firstName}</span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};

export default InstructorSelect;