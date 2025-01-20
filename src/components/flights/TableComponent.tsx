import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { flight_sessions, planes, User, userRole } from '@prisma/client';
import TableRowComponent from './TableRowComponent';
import { Checkbox } from '../ui/checkbox';
import { useCurrentUser } from '@/app/context/useCurrentUser';

interface Props {
    sessions: flight_sessions[];  ///< Array of flight session objects
    setSessionChecked: React.Dispatch<React.SetStateAction<flight_sessions[]>>; ///< Function to update selected session IDs
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    planesProp: planes[];
    usersProp: User[];
}

const TableComponent = ({ sessions, setSessions, setSessionChecked, planesProp, usersProp }: Props) => {
    const { currentUser } = useCurrentUser();
    const [isAllChecked, setIsAllChecked] = useState(false); // State to manage "select all"
    const [sessionsSorted, setSessionsSorted] = useState<flight_sessions[]>([]); // State for sorted sessions
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

    // Handle "select all" checkbox
    const handleSelectAll = (checked: boolean) => {
        setIsAllChecked(checked);
        if (checked) {
            setSessionChecked(sessionsSorted);
        } else {
            setSessionChecked([]);
        }
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
                            <TableHead className="text-black text-center">Heure</TableHead>
                            <TableHead className="text-black text-center">type</TableHead>
                            <TableHead className="text-black text-center">Instructeur</TableHead>
                            <TableHead className="text-black text-center">Élève inscrit</TableHead>
                            <TableHead className="text-black text-center">Appareils</TableHead>
                            {currentUser?.role === userRole.ADMIN || currentUser?.role === userRole.INSTRUCTOR || currentUser?.role === userRole.OWNER ? (
                                <TableHead className="text-black text-center">Action</TableHead>
                            ) : null}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {sessionsSorted.map((session,) => (
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

        </div>

    );
};

export default TableComponent;
