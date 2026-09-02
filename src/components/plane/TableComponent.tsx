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

    // Président (OWNER) et admin voient toutes les machines du club : on leur
    // indique le propriétaire de chaque machine (colonne dédiée).
    const canViewOwner =
        currentUser?.role === userRole.OWNER ||
        currentUser?.role === userRole.ADMIN;

    // La colonne "Actions" s'affiche dès que l'utilisateur peut gérer au moins
    // une machine de la liste (une machine club s'il est gestionnaire, ou sa
    // propre machine privée).
    const canManage = !!currentUser &&
        !!planes?.some((p) => canManagePlane(p, currentUser));

    // La colonne « Actions » apparaît aussi pour les accès maintenance (ex. un
    // instructeur voit la maintenance des machines club sans pouvoir gérer l'avion).
    const canShowActions = !!currentUser &&
        !!planes?.some((p) => canManagePlane(p, currentUser) || canAccessMaintenance(p, currentUser));

    const canViewStatus = canManage ||
        currentUser?.role === userRole.OWNER ||
        currentUser?.role === userRole.ADMIN ||
        currentUser?.role === userRole.MANAGER ||
        currentUser?.role === userRole.STUDENT ||
        currentUser?.role === userRole.PILOT ||
        currentUser?.role === userRole.INSTRUCTOR;

    // Style standardisé pour les headers. Le fond est porté par les cellules ET
    // par le <thead> : un thead sticky en border-collapse ne peint pas toujours
    // son propre fond selon le navigateur.
    const headerClass = "text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 bg-slate-100";

    return (
        <div className="flex flex-col h-full">
            {/* Conteneur scrollable avec la même logique que les vols */}
            <div className="relative w-full overflow-auto rounded-b-2xl">

                <Table className="w-full text-sm text-left border-collapse">
                    {/* Sticky Header : Reste en haut au scroll */}
                    <TableHeader className="sticky top-0 z-10 bg-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        {/* Trait de 2px : il doit se lire différemment des
                            séparateurs de lignes (1px), sinon l'en-tête se fond
                            dans le contenu. Pas de hover : un en-tête n'est pas
                            cliquable et s'éclaircissait au survol. */}
                        <TableRow className="border-b-2 border-slate-300 hover:bg-transparent">

                            {/* Colonne Icône (Visuel) */}
                            <TableHead className={`${headerClass} w-[50px] text-center`}>
                            </TableHead>

                            {/* Colonne Nom */}
                            <TableHead className={`${headerClass} pl-4`}>
                                Nom
                            </TableHead>

                            {/* Colonne Propriétaire (président/admin uniquement) */}
                            {canViewOwner && (
                                <TableHead className={`${headerClass} pl-4`}>
                                    Propriétaire
                                </TableHead>
                            )}

                            {/* Colonne Immatriculation */}
                            <TableHead className={`${headerClass} text-center`}>
                                Immatriculation
                            </TableHead>

                            {/* Colonne Classe */}
                            <TableHead className={`${headerClass} text-center hidden sm:table-cell`}>
                                Classe
                            </TableHead>

                            {/* Colonne Heures moteur */}
                            <TableHead className={`${headerClass} text-center hidden sm:table-cell`}>
                                Heures moteur
                            </TableHead>

                            {/* Colonne État */}
                            {canViewStatus && (
                                <TableHead className={`${headerClass} text-center`}>
                                    État
                                </TableHead>
                            )}

                            {/* Colonne Actions */}
                            {canShowActions && (
                                <TableHead className={`${headerClass} text-right pr-6`}>
                                </TableHead>
                            )}
                        </TableRow>
                    </TableHeader>

                    {/* Pas de `divide-y` ici : TableRow porte déjà `border-b` et
                        TableBody neutralise celui de la dernière ligne. Cumuler les
                        deux mécanismes donnait un seul séparateur visible (celui de
                        la 1re ligne), les suivants passant en border-top slate-100
                        quasi invisible. Même réglage que la page Vols. */}
                    <TableBody className="bg-white">
                        {planes && planes.length > 0 ? (
                            planes.map((plane, index) => (
                                <TableRowComponent
                                    key={plane.id || index} // Préférer l'ID si dispo, sinon index
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
                            // État vide (Empty State)
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