import React from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '../ui/table';
import TableRowComponent from './TableRowComponent';
import { Plane } from '@/config/exempleData';

interface props {
    planes: Plane[];
}

const TableComponent = ({ planes }: props) => {
    return (
        <div className="max-h-[70vh] overflow-y-auto bg-white rounded-lg"> {/* Conteneur avec max-height et overflow */}
            <Table className='w-full'>
                <TableHeader className='sticky top-0 bg-white z-10'> {/* Sticky header */}
                    <TableRow className='font-semibold text-lg'>
                        <TableHead className='text-black text-center'>Nom</TableHead>
                        <TableHead className='text-black text-center'>Immatriculation</TableHead>
                        <TableHead className='text-black text-center'>État</TableHead>
                        <TableHead className='text-black text-center'>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="max-h-[60vh] overflow-y-auto"> {/* Body du tableau avec scroll */}
                    {planes.map((plane, index) => (
                        <TableRowComponent plane={plane} key={index} />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export default TableComponent;
