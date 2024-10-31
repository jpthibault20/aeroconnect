import React from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '../ui/table';
import { User } from '@prisma/client';
import TableRowComponent from './TableRowComponent';

interface props {
    users: User[];  ///< Array of User objects representing the users to be displayed in the table.
}

/**
 * TableComponent
 * @param {props} props - The props for the component.
 * @returns {JSX.Element} The rendered table component with user data.
 */
const TableComponent = ({ users }: props): JSX.Element => {
    return (
        <div className="max-h-[70vh] overflow-y-auto bg-white rounded-lg">
            <Table className='w-full'>
                <TableHeader className='sticky top-0 bg-white z-10'>
                    <TableRow>
                        <TableHead className='font-semibold text-lg text-black'>Nom</TableHead>
                        <TableHead className='font-semibold text-lg text-black text-center'>Rôle</TableHead>
                        <TableHead className='font-semibold text-lg text-black text-center'>Utilisateur restreint</TableHead>
                        <TableHead className='font-semibold text-lg text-black text-center'>Téléphone</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="max-h-[60vh] overflow-y-auto w-full">
                    {users.map((user, index) => (
                        <TableRowComponent user={user} key={index} />  ///< Renders a row for each user.
                    ))
                    }
                </TableBody>
            </Table>
        </div>
    );
}

export default TableComponent;
