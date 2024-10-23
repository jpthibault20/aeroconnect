"use client"
import React from 'react'
import { planeExemple } from '@/config/exempleData'
import { Button } from '../ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { IoMdClose } from "react-icons/io";
import { FaPen } from "react-icons/fa";



const PlanesPage = () => {

    const onClickNewPlane = () => {
        console.log('new plane')
    }

    const onClickDeletePlane = (planeId: number) => () => {
        console.log('Delete plane : ', planeId)
    }

    const onClickUpdatePlane = (planeId: number) => () => {
        console.log('Update plane : ', planeId)
    }

    return (
        <div className='p-6'>
            <div className='flex space-x-3'>
                <p className='font-medium text-3xl'>Les avions</p>
                <p className='text-[#797979] text-3xl'>{planeExemple.length}</p>
            </div>
            <div className='my-3 flex justify-end'>
                <Button onClick={onClickNewPlane} className='bg-[#774BBE]'>
                    Nouveau
                </Button>
            </div>
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
                    {planeExemple.map((plane, index) => (
                        <TableRow key={index} className='text-center'>
                            <TableCell>{plane.name}</TableCell>
                            <TableCell>{plane.immatriculation}</TableCell>
                            <TableCell>{plane.operational ? 'Opérationnel' : 'En maintenance'}</TableCell>
                            <TableCell className='flex flex-col items-center space-y-3 justify-center xl:block xl:space-x-5'>
                                <button onClick={onClickUpdatePlane(plane.id)}>
                                    <FaPen color='blue' size={15} />
                                </button>
                                <button onClick={onClickDeletePlane(plane.id)}>
                                    <IoMdClose color='red' size={20} />
                                </button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

export default PlanesPage
