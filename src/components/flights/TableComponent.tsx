/**
 * @file TableComponent.tsx
 * @brief Displays the list of flight sessions in a responsive table.
 * @details
 * Refactored for Aero Connect:
 * - Sticky headers for better UX on long lists.
 * - refined typography (smaller, uppercase headers).
 * - Horizontal scrolling on mobile without breaking layout.
 */

import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { flight_sessions, planes, User, userRole } from '@prisma/client';
import TableRowComponent from './TableRowComponent';
import { Checkbox } from '../ui/checkbox';
import { useCurrentUser } from '@/app/context/useCurrentUser';

interface Props {
    sessions: flight_sessions[];
    setSessionChecked: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    planesProp: planes[];
    usersProp: User[];
}

const TableComponent = ({ sessions, setSessions, setSessionChecked, planesProp, usersProp }: Props) => {
    const { currentUser } = useCurrentUser();
    const [isAllChecked, setIsAllChecked] = useState(false);
    const [sessionsSorted, setSessionsSorted] = useState<flight_sessions[]>([]);

    // Sort sessions chronologically
    useEffect(() => {
        const sortedSessions = [...sessions].sort((a, b) => {
            const dateA = new Date(a.sessionDateStart).getTime();
            const dateB = new Date(b.sessionDateStart).getTime();
            return dateA - dateB;
        });

        setSessionsSorted(sortedSessions);
        setIsAllChecked(false);
    }, [sessions]);

    // Handle "select all"
    const handleSelectAll = (checked: boolean) => {
        setIsAllChecked(checked);
        if (checked) {
            setSessionChecked(sessionsSorted);
        } else {
            setSessionChecked([]);
        }
    };

    // Helper class for table headers to ensure consistency
    // text-xs uppercase tracking-wider = Standard moderne pour les headers de table SaaS
    const headerClass = "text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap py-3";

    return (
        <div className="flex flex-col h-full">
            {/* Container principal avec gestion du scroll.
                On utilise h-[calc(100vh-...)] ou max-h pour limiter la hauteur si besoin,
                mais ici on laisse le parent gérer la hauteur ou on met une limite fixe.
            */}
            <div className="relative w-full overflow-auto max-h-[70vh] rounded-b-2xl">

                <Table className="w-full text-sm text-left">
                    {/* Sticky Header: Reste accroché en haut lors du scroll */}
                    <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        <TableRow className="border-b border-slate-200 hover:bg-slate-50">

                            {/* Checkbox Column */}
                            <TableHead className="w-[50px] text-center p-4">
                                <Checkbox
                                    className="border-slate-300 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                    checked={isAllChecked}
                                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                />
                            </TableHead>

                            {/* Data Columns */}
                            <TableHead className={`${headerClass} text-center`}>Date</TableHead>
                            <TableHead className={`${headerClass} text-center`}>Heure</TableHead>
                            <TableHead className={`${headerClass} text-center`}>Type</TableHead>
                            <TableHead className={`${headerClass} pl-4`}>Instructeur</TableHead>
                            <TableHead className={`${headerClass} pl-4`}>Élève</TableHead>
                            <TableHead className={`${headerClass} text-center`}>Appareil</TableHead>
                            <TableHead className={`${headerClass} text-center`}>Notes</TableHead>

                            {/* Action Column (Conditional) */}
                            {(currentUser?.role === userRole.ADMIN || currentUser?.role === userRole.INSTRUCTOR || currentUser?.role === userRole.OWNER || currentUser?.role === userRole.MANAGER) && (
                                <TableHead className={`${headerClass} text-center`}>Action</TableHead>
                            )}
                        </TableRow>
                    </TableHeader>

                    <TableBody className="bg-white">
                        {sessionsSorted.length > 0 ? (
                            sessionsSorted.map((session) => (
                                <TableRowComponent
                                    key={session.id}
                                    session={session}
                                    setSessionChecked={setSessionChecked}
                                    isAllChecked={isAllChecked}
                                    planesProp={planesProp}
                                    sessions={sessions}
                                    setSessions={setSessions}
                                    usersProp={usersProp}
                                />
                            ))
                        ) : (
                            // État vide pour éviter une table "cassée" si pas de données
                            <TableRow>
                                <td colSpan={10} className="h-24 text-center text-slate-400">
                                    Aucun vol à afficher.
                                </td>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default TableComponent;