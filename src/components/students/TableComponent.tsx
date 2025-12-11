import React from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '../ui/table';
import { User } from '@prisma/client';
import TableRowComponent from './TableRowComponent';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { User as UserIcon } from 'lucide-react';

interface props {
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

/**
 * TableComponent
 * Displays the list of users with a modern Aero Connect design.
 */
const TableComponent = ({ users, setUsers }: props): JSX.Element => {
    const { currentUser } = useCurrentUser();

    // Style standard pour les headers de colonnes (identique aux autres pages)
    const headerClass = "text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 bg-slate-50";

    // Filtrer les utilisateurs à afficher (exclure l'utilisateur courant et les admins si nécessaire)
    // Note : Idéalement, ce filtrage devrait se faire en amont, mais on le garde ici pour la sécurité visuelle
    const displayableUsers = users.filter(user => user.id !== currentUser?.id && user.role !== "ADMIN");

    return (
        <div className="flex flex-col h-full">
            {/* Conteneur scrollable relatif */}
            <div className="relative w-full overflow-auto rounded-b-2xl">

                <Table className='w-full text-left border-collapse'>
                    {/* En-tête Sticky */}
                    <TableHeader className='sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]'>
                        <TableRow className="border-b border-slate-200 hover:bg-slate-50">

                            {/* Colonne Avatar (Visuel) */}
                            <TableHead className={`${headerClass} w-[50px] text-center`}>
                                <UserIcon className="w-4 h-4 mx-auto text-slate-400" />
                            </TableHead>

                            {/* Colonne Identité */}
                            <TableHead className={`${headerClass} pl-4`}>
                                Identité
                            </TableHead>

                            {/* Colonne Rôle - Cachée sur très petit mobile */}
                            <TableHead className={`${headerClass} text-center hidden sm:table-cell`}>
                                Rôle
                            </TableHead>

                            {/* Colonne Téléphone - Cachée sur mobile/tablette */}
                            <TableHead className={`${headerClass} text-center hidden md:table-cell`}>
                                Téléphone
                            </TableHead>

                            {/* Colonne Statut (Restreint/Actif) */}
                            <TableHead className={`${headerClass} text-center`}>
                                Restreint
                            </TableHead>

                            {/*  */}
                            <TableHead className={`${headerClass} text-center`}>

                            </TableHead>

                        </TableRow>
                    </TableHeader>

                    <TableBody className="bg-white divide-y divide-slate-100">
                        {displayableUsers.length > 0 ? (
                            displayableUsers.map((user) => (
                                <TableRowComponent
                                    user={user}
                                    key={user.id}
                                    setUsers={setUsers}
                                />
                            ))
                        ) : (
                            // Empty State (Si aucun utilisateur trouvé)
                            <TableRow>
                                <td colSpan={5} className="h-32 text-center text-slate-400 bg-slate-50/50">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <UserIcon className="w-8 h-8 text-slate-200" />
                                        <p>Aucun membre trouvé.</p>
                                    </div>
                                </td>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

export default TableComponent;