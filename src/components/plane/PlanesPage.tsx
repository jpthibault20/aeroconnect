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
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { planes, userRole } from '@prisma/client';
import NewPlane from './NewPlane';
import Header from './Header';

interface Props {
    PlanesProps: planes[];
}

const useViewportHeight = () => {
    const [vh, setVh] = useState<number>(window.innerHeight);

    useEffect(() => {
        const updateHeight = () => setVh(window.innerHeight);

        window.addEventListener("resize", updateHeight);
        return () => window.removeEventListener("resize", updateHeight);
    }, []);

    return vh;
};

const PlanesPage = ({ PlanesProps }: Props) => {
    const { currentUser } = useCurrentUser();
    const [planes, setPlanes] = useState<planes[]>(PlanesProps);

    const vh = useViewportHeight();

    return (
        <div
            className="flex flex-col bg-gray-200 pb-20 p-3"
            style={{ height: `${vh}px` }} // Hauteur dynamique
        >
            <Header planesLenght={planes.length} />

            <div className="my-3 flex justify-end">
                {currentUser?.role === userRole.ADMIN || currentUser?.role === userRole.OWNER ? (
                    <NewPlane setPlanes={setPlanes} />
                ) : null}
            </div>

            {/* Le tableau doit prendre tout l'espace restant */}
            <div className="flex-1 overflow-y-auto">
                <TableComponent planes={planes} setPlanes={setPlanes} />
            </div>
        </div>
    );
};

export default PlanesPage;
