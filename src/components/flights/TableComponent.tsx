import React, { useState } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FLIGHT_SESSION } from '@prisma/client';
import TableRowComponent from './TableRowComponent';
import { Checkbox } from '../ui/checkbox';

interface props {
    sessions: FLIGHT_SESSION[];
    setSessionChecked: React.Dispatch<React.SetStateAction<number[]>>;
}

const TableComponent = ({ sessions, setSessionChecked }: props) => {
    const [isAllChecked, setIsAllChecked] = useState(false);  // State for "select all"

    const handleSelectAll = (checked: boolean) => {
        setIsAllChecked(checked);
        if (checked) {
            const allIds = sessions.map(session => session.id);
            setSessionChecked(allIds); // Select all sessions
        } else {
            setSessionChecked([]); // Deselect all
        }
    };

    return (
        <Table className="w-full">
            <TableHeader>
                <TableRow>
                    <TableHead>
                        <Checkbox 
                            checked={isAllChecked} 
                            onCheckedChange={(checked) => handleSelectAll(!!checked)} 
                        />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Heure de début</TableHead>
                    <TableHead>Heure de fin</TableHead>
                    <TableHead>Récurrent / Fin</TableHead>
                    <TableHead>Élève inscrit</TableHead>
                    <TableHead>Type de vol</TableHead>
                    <TableHead>Action</TableHead>
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
    );
};

export default TableComponent;
