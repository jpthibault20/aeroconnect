import React from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '../ui/table';
import TableRowComponent from './TableRowComponent';
import { planes, userRole } from '@prisma/client';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { Plane } from 'lucide-react';

interface Props {
    planes: planes[] | undefined;
    setPlanes: React.Dispatch<React.SetStateAction<planes[]>>;
}

const TableComponent = ({ planes, setPlanes }: Props) => {
    const { currentUser } = useCurrentUser();

    // Logique de permission centralisée pour rendre le JSX plus propre
    // On définit qui peut voir les colonnes "Actions" et "État" (si différent)
    const canManage = currentUser?.role === userRole.OWNER ||
        currentUser?.role === userRole.ADMIN ||
        currentUser?.role === userRole.MANAGER;

    const canViewStatus = canManage ||
        currentUser?.role === userRole.STUDENT ||
        currentUser?.role === userRole.PILOT ||
        currentUser?.role === userRole.INSTRUCTOR;

    // Style standardisé pour les headers (identique à la page Vols)
    const headerClass = "text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 bg-slate-50";

    return (
        <div className="flex flex-col h-full">
            {/* Conteneur scrollable avec la même logique que les vols */}
            <div className="relative w-full overflow-auto rounded-b-2xl">

                <Table className="w-full text-sm text-left border-collapse">
                    {/* Sticky Header : Reste en haut au scroll */}
                    <TableHeader className="sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        <TableRow className="border-b border-slate-200 hover:bg-slate-50">

                            {/* Colonne Icône (Visuel) */}
                            <TableHead className={`${headerClass} w-[50px] text-center`}>
                            </TableHead>

                            {/* Colonne Nom */}
                            <TableHead className={`${headerClass} pl-4`}>
                                Nom
                            </TableHead>

                            {/* Colonne Immatriculation */}
                            <TableHead className={`${headerClass} text-center`}>
                                Immatriculation
                            </TableHead>

                            {/* Colonne Classe */}
                            <TableHead className={`${headerClass} text-center hidden sm:table-cell`}>
                                Classe
                            </TableHead>

                            {/* Colonne État */}
                            {canViewStatus && (
                                <TableHead className={`${headerClass} text-center`}>
                                    État
                                </TableHead>
                            )}

                            {/* Colonne Actions */}
                            {canManage && (
                                <TableHead className={`${headerClass} text-right pr-6`}>
                                    Actions
                                </TableHead>
                            )}
                        </TableRow>
                    </TableHeader>

                    <TableBody className="bg-white divide-y divide-slate-100">
                        {planes && planes.length > 0 ? (
                            planes.map((plane, index) => (
                                <TableRowComponent
                                    key={plane.id || index} // Préférer l'ID si dispo, sinon index
                                    plane={plane}
                                    planes={planes}
                                    setPlanes={setPlanes}
                                />
                            ))
                        ) : (
                            // État vide (Empty State)
                            <TableRow>
                                <td colSpan={6} className="h-32 text-center text-slate-400 bg-slate-50/50">
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