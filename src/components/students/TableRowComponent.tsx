/**
 * @file TableRowComponent.tsx
 * @brief This component renders a single row in the user table.
 * It displays user information along with options to update or delete the user.
 * 
 * @details Each row includes the user's picture, name, email, role, restricted status, and phone number.
 * Icons are provided for update and delete actions, which log the respective user IDs to the console when clicked.
 */

import React from 'react';
import Image from 'next/image';
import { TableCell, TableRow } from '../ui/table';
import { IoMdClose } from 'react-icons/io';
import { FaPen } from 'react-icons/fa';
import Restricted from './Restricted';
import userPicture from '../../../public/images/userProfil.png';
import { User } from '@prisma/client';

interface props {
    user: User;  ///< User object representing the user data to be displayed in this row.
}

/**
 * TableRowComponent
 * @param {props} props - The props for the component.
 * @returns {JSX.Element} The rendered table row component for a user.
 */
const TableRowComponent = ({ user }: props): JSX.Element => {

    // Handler for deleting a user; logs the user ID to the console.
    const onClickDeleteUser = () => () => {
        console.log('Delete user: ', user.id);
    }

    // Handler for updating a user; logs the user ID to the console.
    const onClickUpdateUser = () => () => {
        console.log('Update user: ', user.id);
    }

    return (
        <TableRow>
            <TableCell className='md:flex h-full items-center'>
                <Image
                    src={userPicture}
                    alt='User Image'
                    height={50}
                    width={50}
                    className='rounded-full hidden md:flex justify-center'
                    priority
                />
                <div className='ml-4 h-full w-full flex flex-col justify-center items-start'>
                    <div className='font-medium text-left'>
                        {user.lastName.toUpperCase()}{' '}
                        {user.firstName}
                    </div>
                    <div className='text-left text-gray-500'>
                        {user.email}
                    </div>
                </div>
            </TableCell>
            <TableCell className='text-center'>{user.role}</TableCell>{/* Displays the user's role in the system. */}
            <TableCell className='text-center'>
                <Restricted user={user} />{/*< Displays the restricted status of the user.*/}
            </TableCell>
            <TableCell className='text-center'>0{user.phone}</TableCell>{/*< Displays the user's phone number.*/}
            <TableCell className='flex flex-col items-center space-y-3 justify-center xl:block xl:space-x-5'>
                <button onClick={onClickUpdateUser}>
                    <FaPen color='blue' size={15} />{/*< Icon for updating the user.*/}
                </button>
                <button onClick={onClickDeleteUser}>
                    <IoMdClose color='red' size={20} />{/*< Icon for deleting the user.*/}
                </button>
            </TableCell>
        </TableRow>
    );
}

export default TableRowComponent;
