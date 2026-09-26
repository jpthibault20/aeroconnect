import React, { JSX } from 'react';
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

    // Standard column header style (same as the other pages). The background is set
    // on the cells AND the <thead>: a sticky thead with border-collapse does not
    // always paint its own background, depending on the browser.
    const headerClass = "text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 bg-slate-100";

    // Users to display (excluding the current user and admins). Ideally done
    // upstream, kept here as a visual safeguard.
    const displayableUsers = users.filter(user => user.id !== currentUser?.id && user.role !== "ADMIN");

    return (
        <div className="flex flex-col h-full">
            <div className="relative w-full overflow-auto rounded-b-2xl">

                <Table className='w-full text-left border-collapse'>
                    <TableHeader className='sticky top-0 z-10 bg-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)]'>
                        {/* 2px rule: it must read differently from the row separators (1px), otherwise the header blends into the content. No hover: a header is not clickable and used to lighten on hover. */}
                        <TableRow className="border-b-2 border-slate-300 hover:bg-transparent">

                            <TableHead className={`${headerClass} w-[50px] text-center`}>
                                <UserIcon className="w-4 h-4 mx-auto text-slate-400" />
                            </TableHead>

                            <TableHead className={`${headerClass} pl-4`}>
                                Identité
                            </TableHead>

                            <TableHead className={`${headerClass} text-center hidden sm:table-cell`}>
                                Rôle
                            </TableHead>

                            <TableHead className={`${headerClass} text-center hidden md:table-cell`}>
                                Téléphone
                            </TableHead>

                            <TableHead className={`${headerClass} text-center`}>
                                Restreint
                            </TableHead>

                            <TableHead className={`${headerClass} text-center`}>

                            </TableHead>

                        </TableRow>
                    </TableHeader>

                    {/* No `divide-y` here: TableRow already has `border-b` and TableBody removes the last row's. Combining both left a single visible separator (the first row's), the others turning into a nearly invisible slate-100 border-top. Same setup as the Flights page. */}
                    <TableBody className="bg-white">
                        {displayableUsers.length > 0 ? (
                            displayableUsers.map((user) => (
                                <TableRowComponent
                                    user={user}
                                    key={user.id}
                                    setUsers={setUsers}
                                />
                            ))
                        ) : (
                            // Empty state (no user found)
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