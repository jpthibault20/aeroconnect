import React from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '../ui/table';
import TableRowComponent from './TableRowComponent';
import { planes, userRole } from '@prisma/client';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { Plane } from 'lucide-react';
import { canManagePlane, canAccessMaintenance } from '@/lib/planeVisibility';

interface Props {
    planes: planes[] | undefined;
    setPlanes: React.Dispatch<React.SetStateAction<planes[]>>;
    ownerNames?: Record<string, string>;
    onOwnerNameResolved?: (ownerID: string, ownerName: string) => void;
    overduePlaneIDs?: string[];
}

const TableComponent = ({ planes, setPlanes, ownerNames, onOwnerNameResolved, overduePlaneIDs }: Props) => {
    const { currentUser } = useCurrentUser();

    // President (OWNER) and admin see every club plane: they are shown each plane's
    // owner (dedicated column).
    const canViewOwner =
        currentUser?.role === userRole.OWNER ||
        currentUser?.role === userRole.ADMIN;

    // The "Actions" column shows as soon as the user can manage at least one plane
    // in the list (a club plane if management, or their own private plane).
    const canManage = !!currentUser &&
        !!planes?.some((p) => canManagePlane(p, currentUser));

    // The "Actions" column also shows for maintenance access (e.g. an instructor sees
    // club planes' maintenance without being able to manage the plane).
    const canShowActions = !!currentUser &&
        !!planes?.some((p) => canManagePlane(p, currentUser) || canAccessMaintenance(p, currentUser));

    const canViewStatus = canManage ||
        currentUser?.role === userRole.OWNER ||
        currentUser?.role === userRole.ADMIN ||
        currentUser?.role === userRole.MANAGER ||
        currentUser?.role === userRole.STUDENT ||
        currentUser?.role === userRole.PILOT ||
        currentUser?.role === userRole.INSTRUCTOR;

    // Standard header style. The background is set on the cells AND the <thead>: a
    // sticky thead with border-collapse does not always paint its own background,
    // depending on the browser.
    const headerClass = "text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 bg-slate-100";

    return (
        <div className="flex flex-col h-full">
            <div className="relative w-full overflow-auto rounded-b-2xl">

                <Table className="w-full text-sm text-left border-collapse">
                    {/* Sticky header: stays on top while scrolling */}
                    <TableHeader className="sticky top-0 z-10 bg-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        {/* 2px rule: it must read differently from the row separators (1px), otherwise the header blends into the content. No hover: a header is not clickable and used to lighten on hover. */}
                        <TableRow className="border-b-2 border-slate-300 hover:bg-transparent">

                            <TableHead className={`${headerClass} w-[50px] text-center`}>
                            </TableHead>

                            <TableHead className={`${headerClass} pl-4`}>
                                Nom
                            </TableHead>

                            {/* Owner column (president/admin only) */}
                            {canViewOwner && (
                                <TableHead className={`${headerClass} pl-4`}>
                                    Propriétaire
                                </TableHead>
                            )}

                            <TableHead className={`${headerClass} text-center`}>
                                Immatriculation
                            </TableHead>

                            <TableHead className={`${headerClass} text-center hidden sm:table-cell`}>
                                Classe
                            </TableHead>

                            <TableHead className={`${headerClass} text-center hidden sm:table-cell`}>
                                Heures moteur
                            </TableHead>

                            {canViewStatus && (
                                <TableHead className={`${headerClass} text-center`}>
                                    État
                                </TableHead>
                            )}

                            {canShowActions && (
                                <TableHead className={`${headerClass} text-right pr-6`}>
                                </TableHead>
                            )}
                        </TableRow>
                    </TableHeader>

                    {/* No `divide-y` here: TableRow already has `border-b` and TableBody removes the last row's. Combining both left a single visible separator (the first row's), the others turning into a nearly invisible slate-100 border-top. Same setup as the Flights page. */}
                    <TableBody className="bg-white">
                        {planes && planes.length > 0 ? (
                            planes.map((plane, index) => (
                                <TableRowComponent
                                    key={plane.id || index}
                                    plane={plane}
                                    planes={planes}
                                    setPlanes={setPlanes}
                                    canViewOwner={canViewOwner}
                                    ownerNames={ownerNames}
                                    onOwnerNameResolved={onOwnerNameResolved}
                                    isOverdue={!!overduePlaneIDs?.includes(plane.id)}
                                />
                            ))
                        ) : (
                            <TableRow>
                                <td colSpan={8} className="h-32 text-center text-slate-400 bg-slate-50/50">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Plane className="w-8 h-8 text-slate-200" />
                                        <p>Aucun appareil dans la flotte.</p>
                                    </div>
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