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

import React, { useState } from 'react';
import TableComponent from './TableComponent';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { planes, userRole } from '@prisma/client';
import NewPlane from './NewPlane';
import Header from './Header';

interface Props {
    PlanesProps: planes[];
}

const PlanesPage = ({ PlanesProps }: Props) => {
    const { currentUser } = useCurrentUser();
    const [planes, setPlanes] = useState<planes[]>(PlanesProps);

    return (
        <div className='p-6'>
            <Header planesLenght={planes.length} />

            <div className='my-3 flex justify-end'>
                {currentUser?.role === userRole.ADMIN || currentUser?.role === userRole.OWNER ?
                    <NewPlane setPlanes={setPlanes} /> : null
                }
            </div>
            <TableComponent planes={planes} setPlanes={setPlanes} />
        </div>
    );
};

export default PlanesPage;
