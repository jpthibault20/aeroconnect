"use client";
/**
 * @file PlanesPage.tsx
 * @brief A React component for displaying a list of planes.
 * 
 * This component shows the number of planes available and provides a button
 * to create a new plane. It also renders a table of planes using the 
 * `TableComponent`.
 * 
 * @returns The rendered planes page component.
 */

import React from 'react';
import { planeExemple } from '@/config/exempleData';
import { Button } from '../ui/button';
import TableComponent from './TableComponent';

const PlanesPage = () => {
    /**
     * @function onClickNewPlane
     * @brief Handles the click event for creating a new plane.
     * 
     * This function logs a message to the console when the "New" button
     * is clicked.
     */
    const onClickNewPlane = () => {
        console.log('new plane');
    };

    return (
        <div className='p-6'>
            <div className='flex space-x-3'>
                <p className='font-medium text-3xl'>Les avions</p>
                <p className='text-[#797979] text-3xl'>{planeExemple.length}</p>
            </div>
            <div className='my-3 flex justify-end'>
                <Button onClick={onClickNewPlane} className='bg-[#774BBE] hover:bg-[#3d2365]'>
                    Nouveau
                </Button>
            </div>
            <TableComponent planes={planeExemple} />
        </div>
    );
};

export default PlanesPage;
