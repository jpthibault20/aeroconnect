/**
 * @file TableRowComponent.tsx
 * @brief A React component representing a single row in the flight sessions table.
 * 
 * This component displays information about a single flight session and provides functionality
 * for selecting the session, updating, and deleting it.
 * 
 * @param {Object} props - Component props.
 * @param {flight_sessions} props.session - The flight session object to display.
 * @param {React.Dispatch<React.SetStateAction<number[]>>} props.setSessionChecked - Function to set the IDs of checked sessions.
 * @param {boolean} props.isAllChecked - Indicates if the "select all" checkbox is checked.
 * 
 * @returns {JSX.Element} The rendered table row component.
 */

import React, { useState, useEffect } from 'react';
import { TableCell, TableRow } from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { flight_sessions } from '@prisma/client';
import { FaPen } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';

interface props {
    session: flight_sessions;  ///< The flight session object
    setSessionChecked: React.Dispatch<React.SetStateAction<string[]>>; ///< Function to update selected session IDs
    isAllChecked: boolean; ///< Indicates if "select all" is checked
}

const TableRowComponent = ({ session, setSessionChecked, isAllChecked }: props) => {
    const [isChecked, setIsChecked] = useState(false); // State for individual checkbox

    const finalDate = new Date(session.sessionDateStart);
    finalDate.setMinutes(finalDate.getMinutes() + session.sessionDateDuration_min); // Calculate end time of the session

    /**
     * Handles individual checkbox change.
     *
     * @param {string} sessionId - The ID of the flight session.
     * @param {boolean} checked - The checked state of the checkbox.
     */
    const onChecked = (sessionId: string, checked: boolean) => {
        setIsChecked(checked);
        setSessionChecked((prev) => {
            if (checked) {
                return [...prev, sessionId]; // Add session ID if checked
            } else {
                return prev.filter(id => id !== sessionId); // Remove session ID if unchecked
            }
        });
    };

    // Sync individual checkbox state with "select all"
    useEffect(() => {
        setIsChecked(isAllChecked);
    }, [isAllChecked]);

    /**
     * Handles the delete action for flights.
     *
     * @param {string} flightsId - The ID of the flight to delete.
     * @returns {Function} The click event handler.
     */
    const onClickDeleteFlights = (flightsId: string) => () => {
        console.log('Delete flights : ', flightsId);
    };

    /**
     * Handles the update action for flights.
     *
     * @param {string} flightsId - The ID of the flight to update.
     * @returns {Function} The click event handler.
     */
    const onClickUpdateFlights = (flightsId: string) => () => {
        console.log('Update flights : ', flightsId);
    };

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
                {session.sessionDateStart.toISOString().slice(11, 16)}
            </TableCell>
            <TableCell className='text-center'>
                {finalDate.toISOString().slice(11, 16)}
            </TableCell>
            <TableCell className='text-center'>
                {session.finalReccurence !== null ? (session.finalReccurence.toLocaleDateString('fr-FR', { day: 'numeric', month: '2-digit', year: 'numeric' })) : 'NON'}
            </TableCell>
            <TableCell className='text-center'>
                {session.studentFirstName ? session.studentFirstName : '...'}
            </TableCell>
            {/* <TableCell className='text-center'>
                {session.flightType}
            </TableCell> */}
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
