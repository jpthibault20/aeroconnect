import React, { useState, useEffect } from 'react';
import { TableCell, TableRow } from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { FLIGHT_SESSION } from '@prisma/client';
import { FaPen } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';

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

    const onClickDeleteFlights = (flightsId: number) => () => {
        console.log('Delete flights : ', flightsId)
    }

    const onClickUpdateFlights = (flightsId: number) => () => {
        console.log('Update flights : ', flightsId)
    }

    return (
        <TableRow className='font-istok'>
            <TableCell className='text-center'>
                <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => onChecked(session.id, !!checked)}
                />
            </TableCell>
            <TableCell className='text-center'>
                {session.sessionDateStart.toLocaleDateString('fr-FR', { day: 'numeric', month: '2-digit', year: 'numeric' })}
            </TableCell>
            <TableCell className='text-center'>
                {session.sessionDateStart.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </TableCell>
            <TableCell className='text-center'>
                {finalDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </TableCell>
            <TableCell className='text-center'>
                {session.finalReccurence !== null ? (session.finalReccurence.toLocaleDateString('fr-FR', { day: 'numeric', month: '2-digit', year: 'numeric' })) : 'NON'}
            </TableCell>
            <TableCell className='text-center'>
                {session.studentFirstName}
            </TableCell>
            <TableCell className='text-center'>
                {session.flightType}
            </TableCell>
            <TableCell className='flex flex-col items-center space-y-3 justify-center xl:block xl:space-x-5'>
                <button onClick={onClickUpdateFlights(session.id)}>
                    <FaPen color='blue' size={15} />
                </button>
                <button onClick={onClickDeleteFlights(session.id)}>
                    <IoMdClose color='red' size={20} />
                </button>
            </TableCell>
        </TableRow>
    );
};

export default TableRowComponent;
