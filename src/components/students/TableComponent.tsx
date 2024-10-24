/**
 * @file TableComponent.tsx
 * @brief This component renders a table displaying user information.
 * It utilizes Tailwind CSS for styling and Prisma's User type for type safety.
 * 
 * @details The component receives a list of users and displays their names, roles, restricted user status, 
 * and phone numbers in a structured format. The layout is responsive and styled for better usability.
 */

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
        <Table className='bg-white rounded-lg'>
            <TableHeader>
                <TableRow>
                    <TableHead className='font-semibold text-lg text-black'>Nom</TableHead>  {/*< Column header for user name.*/}
                    <TableHead className='font-semibold text-lg text-black text-center'>Rôle</TableHead>  {/*< Column header for user role.*/}
                    <TableHead className='font-semibold text-lg text-black text-center'>Utilisateur restreint</TableHead>  {/*< Column header for restricted user status.*/}
                    <TableHead className='font-semibold text-lg text-black text-center'>Téléphone</TableHead>  {/*< Column header for user phone number.*/}
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.map((user, index) => (
                    <TableRowComponent user={user} key={index} />  ///< Renders a row for each user.
                ))}
            </TableBody>
        </Table>
    );
}

export default TableComponent;
