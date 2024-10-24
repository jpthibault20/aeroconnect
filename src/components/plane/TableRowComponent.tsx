/**
 * @file TableRowComponent.tsx
 * @brief A React component that renders a row in the plane table.
 * 
 * This component represents a single row in the plane table, displaying 
 * the attributes of a plane including its name, registration, and 
 * operational status. It also provides buttons for updating and deleting 
 * the plane.
 * 
 * @param {Object} props - The component properties.
 * @param {Plane} props.plane - The plane object containing its details.
 * 
 * @returns {JSX.Element} The rendered table row component.
 */

import React from 'react';
import { TableCell, TableRow } from '../ui/table';
import { FaPen } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import { Plane } from '@/config/exempleData';

interface Props {
    plane: Plane; // Utiliser le type Plane ici
}

const TableRowComponent = ({ plane }: Props) => {

    const onClickUpdatePlane = () => {
        console.log('Update plane : ', plane.id);
    }

    const onClickDeletePlane = () => {
        console.log('Delete plane : ', plane.id);
    }

    return (
        <TableRow className='text-center'>
            <TableCell>{plane.name}</TableCell>
            <TableCell>{plane.immatriculation}</TableCell>
            <TableCell>{plane.operational ? 'Opérationnel' : 'En maintenance'}</TableCell>
            <TableCell className='flex flex-col items-center space-y-3 justify-center xl:block xl:space-x-5'>
                <button onClick={onClickUpdatePlane}>
                    <FaPen color='blue' size={15} />
                </button>
                <button onClick={onClickDeletePlane}>
                    <IoMdClose color='red' size={20} />
                </button>
            </TableCell>
        </TableRow>
    );
}

export default TableRowComponent;
