import React, { useState, useEffect } from 'react';
import { TableCell, TableRow } from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { FLIGHT_SESSION } from '@prisma/client';

interface props {
    session: FLIGHT_SESSION;
    setSessionChecked: React.Dispatch<React.SetStateAction<number[]>>;
    isAllChecked: boolean; // Prop to know if "select all" is checked
}

const TableRowComponent = ({ session, setSessionChecked, isAllChecked }: props) => {
    const [isChecked, setIsChecked] = useState(false); // State for each checkbox

    const finalDate = new Date(session.sessionDateStart);
    finalDate.setMinutes(finalDate.getMinutes() + session.sessionDateDuration_min);

    // Handle individual checkbox change
    const onChecked = (sessionId: number, checked: boolean) => {
        setIsChecked(checked);
        setSessionChecked((prev) => {
            if (checked) {
                return [...prev, sessionId]; // Add ID if checked
            } else {
                return prev.filter(id => id !== sessionId); // Remove ID if unchecked
            }
        });
    };

    // Sync individual checkbox with "select all"
    useEffect(() => {
        setIsChecked(isAllChecked);
    }, [isAllChecked]);

    return (
        <TableRow className='font-istok'>
            <TableCell>
                <Checkbox 
                    checked={isChecked} 
                    onCheckedChange={(checked) => onChecked(session.id, !!checked)} 
                />
            </TableCell>
            <TableCell>
                {session.sessionDateStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </TableCell>
            <TableCell>
                {session.sessionDateStart.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </TableCell>
            <TableCell>
                {finalDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </TableCell>
            <TableCell>
                {session.finalReccurence !== null ? 'OUI' : 'NON'}
            </TableCell>
            <TableCell>
                {session.studentFirstName}
            </TableCell>
            <TableCell>
                {session.flightType}
            </TableCell>
            <TableCell>
                action
            </TableCell>
        </TableRow>
    );
};

export default TableRowComponent;
