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

import React, { useEffect, useState } from 'react';
import TableComponent from './TableComponent';
import { getPlanes } from '@/api/db/session';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { planes } from '@prisma/client';
import NewPlane from './NewPlane';

const PlanesPage = () => {
    const { currentUser } = useCurrentUser()
    const [reload, setReload] = useState(false);
    const [planes, setPlanes] = useState<planes[]>();

    useEffect(() => {
        const fetchPlanes = async () => {
            if (currentUser) {
                try {
                    const res = await getPlanes(currentUser.clubID);
                    if (Array.isArray(res)) {
                        setPlanes(res);
                    }
                } catch (error) {
                    console.error('Error fetching planes:', error);
                }
            }
        };
        fetchPlanes();
    }, [currentUser, reload]);

    useEffect(() => {
    }, [planes])

    return (
        <div className='p-6'>
            <div className='flex space-x-3'>
                <p className='font-medium text-3xl'>Les avions</p>
                <p className='text-[#797979] text-3xl'>{planes?.length}</p>
            </div>
            <div className='my-3 flex justify-end'>
                <NewPlane reload={reload} setReload={setReload} />
            </div>
            <TableComponent planes={planes} />
        </div>
    );
};

export default PlanesPage;
