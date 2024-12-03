import React from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '../ui/table';
import TableRowComponent from './TableRowComponent';
import { planes, userRole } from '@prisma/client';
import { useCurrentUser } from '@/app/context/useCurrentUser';

interface props {
    planes: planes[] | undefined
    setPlanes: React.Dispatch<React.SetStateAction<planes[]>>
}

const TableComponent = ({ planes, setPlanes }: props) => {
    const { currentUser } = useCurrentUser()

    return (
        <div className="max-h-[70vh] overflow-y-auto bg-white rounded-lg">
            <Table className='w-full'>
                <TableHeader className='sticky top-0 bg-white z-10'>
                    <TableRow className='font-semibold text-lg'>
                        <TableHead className='text-black text-center'>Nom</TableHead>
                        <TableHead className='text-black text-center'>Immatriculation</TableHead>
                        {currentUser?.role == userRole.OWNER || currentUser?.role == userRole.ADMIN ?
                            (<>
                                <TableHead className='text-black text-center'>État</TableHead>
                                <TableHead className='text-black text-center'>Actions</TableHead>
                            </>
                            ) : currentUser?.role == userRole.STUDENT || currentUser?.role == userRole.PILOT || currentUser?.role == userRole.INSTRUCTOR ?
                                (
                                    <>
                                        <TableHead className='text-black text-center'>État</TableHead>
                                    </>
                                ) : null
                        }

                    </TableRow>
                </TableHeader>
                <TableBody className="max-h-[60vh] overflow-y-auto">
                    {planes?.map((plane, index) => (
                        <TableRowComponent plane={plane} key={index} planes={planes} setPlanes={setPlanes} />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export default TableComponent;
