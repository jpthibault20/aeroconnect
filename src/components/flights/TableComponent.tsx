import React, { useState } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FLIGHT_SESSION } from '@prisma/client';
import TableRowComponent from './TableRowComponent';
import { Checkbox } from '../ui/checkbox';

interface props {
    sessions: FLIGHT_SESSION[];  ///< Array of flight session objects
    setSessionChecked: React.Dispatch<React.SetStateAction<number[]>>; ///< Function to update selected session IDs
}

const TableComponent = ({ sessions, setSessionChecked }: props) => {
    const [isAllChecked, setIsAllChecked] = useState(false);  ///< State to manage the "select all" checkbox

    /**
     * Handles the selection of all sessions based on the checkbox state.
     *
     * @param {boolean} checked - The checked state of the "select all" checkbox.
     */
    const handleSelectAll = (checked: boolean) => {
        setIsAllChecked(checked);
        if (checked) {
            const allIds = sessions.map(session => session.id); // Get all session IDs
            setSessionChecked(allIds); // Select all sessions
        } else {
            setSessionChecked([]); // Deselect all sessions
        }
    };

    return (
        <div className="max-h-[70vh] overflow-y-auto"> {/* Ajout du max-height et overflow */}
            <Table className="w-full bg-white rounded-lg">
                <TableHeader className='ml-2'>
                    <TableRow className='font-semibold text-lg'>
                        <TableHead className='text-center'>
                            <Checkbox
                                checked={isAllChecked}
                                onCheckedChange={(checked) => handleSelectAll(!!checked)}
                            />
                        </TableHead>
                        <TableHead className='text-black text-center'>Date</TableHead>
                        <TableHead className='text-black text-center'>Heure de début</TableHead>
                        <TableHead className='text-black text-center'>Heure de fin</TableHead>
                        <TableHead className='text-black text-center'>Récurrence</TableHead>
                        <TableHead className='text-black text-center'>Élève inscrit</TableHead>
                        <TableHead className='text-black text-center'>Type de vol</TableHead>
                        <TableHead className='text-black text-center'>Action</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {sessions.map((session, index) => (
                        <TableRowComponent
                            key={index}
                            session={session}
                            setSessionChecked={setSessionChecked}
                            isAllChecked={isAllChecked} // Pass the "select all" state
                        />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default TableComponent;
