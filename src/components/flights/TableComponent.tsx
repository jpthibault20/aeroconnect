import React, { useEffect, useState, useMemo } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { flight_sessions, planes, User, userRole } from '@prisma/client';
import TableRowComponent from './TableRowComponent';
import { Checkbox } from '../ui/checkbox';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { Button } from '../ui/button';

interface Props {
    sessions: flight_sessions[];  ///< Array of flight session objects
    setSessionChecked: React.Dispatch<React.SetStateAction<string[]>>; ///< Function to update selected session IDs
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    planesProp: planes[];
    usersProp: User[]
}

const TableComponent = ({ sessions, setSessions, setSessionChecked, planesProp, usersProp }: Props) => {
    const { currentUser } = useCurrentUser();
    const [isAllChecked, setIsAllChecked] = useState(false); // State to manage "select all"
    const [sessionsSorted, setSessionsSorted] = useState<flight_sessions[]>([]); // State for sorted sessions
    const [currentPage, setCurrentPage] = useState(1); // State for pagination
    const itemsPerPage = 10; // Number of sessions per page

    // Effect to sort sessions chronologically
    useEffect(() => {
        const sortedSessions = [...sessions].sort((a, b) => {
            const dateA = new Date(a.sessionDateStart).getTime();
            const dateB = new Date(b.sessionDateStart).getTime();
            return dateA - dateB; // Ascending order
        });

        setSessionsSorted(sortedSessions);
        setIsAllChecked(false); // Reset "select all"
    }, [sessions]);

    // Calculate the sessions to display on the current page
    const currentSessions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return sessionsSorted.slice(startIndex, endIndex);
    }, [sessionsSorted, currentPage]);

    // Calculate total pages
    const totalPages = useMemo(() => Math.ceil(sessionsSorted.length / itemsPerPage), [sessionsSorted.length]);

    // Handle "select all" checkbox
    const handleSelectAll = (checked: boolean) => {
        setIsAllChecked(checked);
        if (checked) {
            const allIds = currentSessions.map(session => session.id); // Only select visible session IDs
            setSessionChecked(allIds);
        } else {
            setSessionChecked([]);
        }
    };

    // Pagination handlers
    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(prev => prev - 1);
    };

    return (
        <div>
            <div className="max-h-[70vh] overflow-y-auto"> {/* Added max-height and overflow */}
                <Table className="w-full bg-white rounded-lg">
                    <TableHeader className="ml-2">
                        <TableRow className="font-semibold text-lg">
                            <TableHead className="text-center">
                                <Checkbox
                                    checked={isAllChecked}
                                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                />
                            </TableHead>
                            <TableHead className="text-black text-center">Date</TableHead>
                            <TableHead className="text-black text-center">Heure de début</TableHead>
                            <TableHead className="text-black text-center">Heure de fin</TableHead>
                            <TableHead className="text-black text-center">Récurrence</TableHead>
                            <TableHead className="text-black text-center">Instructeur</TableHead>
                            <TableHead className="text-black text-center">Élève inscrit</TableHead>
                            <TableHead className="text-black text-center">Avion</TableHead>
                            {currentUser?.role === userRole.ADMIN || currentUser?.role === userRole.INSTRUCTOR || currentUser?.role === userRole.OWNER ? (
                                <TableHead className="text-black text-center">Action</TableHead>
                            ) : null}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {currentSessions.map((session,) => (
                            <TableRowComponent
                                key={session.id}
                                session={session}
                                setSessionChecked={setSessionChecked}
                                isAllChecked={isAllChecked} // Pass the "select all" state
                                planesProp={planesProp}
                                sessions={sessions}
                                setSessions={setSessions}
                                usersProp={usersProp}
                            />
                        ))}
                    </TableBody>
                </Table>


            </div>
            {/* Pagination controls */}
            <div className="flex justify-between items-center mt-4">
                <Button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white text-black rounded hover:bg-gray-300 disabled:bg-gray-100"
                >
                    Précédent
                </Button>
                <span>
                    Page {currentPage} sur {totalPages}
                </span>
                <Button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white text-black rounded hover:bg-gray-300 disabled:bg-gray-100"
                >
                    Suivant
                </Button>
            </div>
        </div>

    );
};

export default TableComponent;
