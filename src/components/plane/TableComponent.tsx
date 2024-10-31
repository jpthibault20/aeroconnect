import React from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '../ui/table';
import TableRowComponent from './TableRowComponent';
import { planes } from '@prisma/client';

interface props {
    planes: planes[] | undefined
}

const TableComponent = ({ planes }: props) => {
    return (
        <div className="max-h-[70vh] overflow-y-auto bg-white rounded-lg">
            <Table className='w-full'>
                <TableHeader className='sticky top-0 bg-white z-10'>
                    <TableRow className='font-semibold text-lg'>
                        <TableHead className='text-black text-center'>Nom</TableHead>
                        <TableHead className='text-black text-center'>Immatriculation</TableHead>
                        <TableHead className='text-black text-center'>État</TableHead>
                        <TableHead className='text-black text-center'>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="max-h-[60vh] overflow-y-auto">
                    {planes?.map((plane, index) => (
                        <TableRowComponent plane={plane} key={index} />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export default TableComponent;
