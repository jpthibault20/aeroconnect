import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { flight_sessions, planes, userRole } from '@prisma/client';
import TableRowComponent from './TableRowComponent';
import { Checkbox } from '../ui/checkbox';
import { useCurrentUser } from '@/app/context/useCurrentUser';

interface props {
    sessions: flight_sessions[];  ///< Array of flight session objects
    setSessionChecked: React.Dispatch<React.SetStateAction<string[]>>; ///< Function to update selected session IDs
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    planesProp: planes[];
}

const TableComponent = ({ sessions, setSessions, setSessionChecked, planesProp }: props) => {
    const { currentUser } = useCurrentUser();
    const [isAllChecked, setIsAllChecked] = useState(false);  ///< State to manage the "select all" checkbox
    const [sessionsSorted, setSessionsSorted] = useState<flight_sessions[]>([]); ///< State to store the sorted sessions


    useEffect(() => {
        // Tri des sessions par ordre chronologique (date de début croissante)
        const sortedSessions = [...sessions].sort((a, b) => {
            const dateA = new Date(a.sessionDateStart).getTime();
            const dateB = new Date(b.sessionDateStart).getTime();
            return dateA - dateB; // Tri ascendant (chronologique)
        });

        setSessionsSorted(sortedSessions); // Met à jour les sessions triées
        setIsAllChecked(false); // Réinitialise le check
    }, [sessions]);


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
                        <TableHead className='text-black text-center'>Instructeur</TableHead>
                        <TableHead className='text-black text-center'>Élève inscrit</TableHead>
                        <TableHead className='text-black text-center'>Avion</TableHead>
                        {currentUser?.role == userRole.ADMIN || currentUser?.role == userRole.INSTRUCTOR || currentUser?.role == userRole.OWNER ?
                            (
                                < TableHead className='text-black text-center'>Action</TableHead>
                            ) : null
                        }
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {sessionsSorted.map((session, index) => (
                        <TableRowComponent
                            key={index}
                            session={session}
                            setSessionChecked={setSessionChecked}
                            isAllChecked={isAllChecked} // Pass the "select all" state
                            planesProp={planesProp}
                            sessions={sessions}
                            setSessions={setSessions}
                        />
                    ))}
                </TableBody>
            </Table>
        </div >
    );
};

export default TableComponent;
