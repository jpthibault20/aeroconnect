/**
 * @file TableComponent.tsx
 * @brief A React component that renders a table of planes.
 * 
 * This component displays a table with headers for plane attributes such as 
 * name, registration, status, and actions. It maps through the provided 
 * plane data and renders a row for each plane using the `TableRowComponent`.
 * 
 * @param {Object} props - The component properties.
 * @param {Plane[]} props.planes - An array of plane objects to display in the table.
 * 
 * @returns {JSX.Element} The rendered table component.
 */

import React from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '../ui/table';
import TableRowComponent from './TableRowComponent';
import { Plane } from '@/config/exempleData';

interface props {
    planes: Plane[];
}

const TableComponent = ({ planes }: props) => {
    return (
        <Table className='bg-white rounded-lg'>
            <TableHeader>
                <TableRow className='font-semibold text-lg'>
                    <TableHead className='text-black text-center'>Nom</TableHead>
                    <TableHead className='text-black text-center'>Immatriculation</TableHead>
                    <TableHead className='text-black text-center'>État</TableHead>
                    <TableHead className='text-black text-center'>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {planes.map((plane, index) => (
                    <TableRowComponent plane={plane} key={index} />
                ))}
            </TableBody>
        </Table>
    );
}

export default TableComponent;
