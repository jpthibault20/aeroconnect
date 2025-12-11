/**
 * @file PlanesPage.tsx
 * @brief Component for displaying and managing the fleet of planes.
 */

"use client";

import React, { useState } from 'react';
import TableComponent from './TableComponent';
import MobilePlaneList from './MobilePlaneList'; // <-- IMPORT DU NOUVEAU COMPOSANT
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { planes, userRole } from '@prisma/client';
import NewPlane from './NewPlane';
import Header from './Header';

interface Props {
    PlanesProps: planes[];
}

const PlanesPage = ({ PlanesProps }: Props) => {
    const { currentUser } = useCurrentUser();
    const [planesList, setPlanes] = useState<planes[]>(PlanesProps);

    const canEdit = currentUser?.role === userRole.ADMIN ||
        currentUser?.role === userRole.OWNER ||
        currentUser?.role === userRole.MANAGER;

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 p-4 md:p-8 font-sans">

            {/* --- TOP BAR: Titre & Actions --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">

                <div className="flex-1">
                    <Header planesLenght={planesList.length} />
                </div>

                {canEdit && (
                    <div className="shrink-0 w-full md:w-auto">
                        <NewPlane setPlanes={setPlanes} />
                    </div>
                )}
            </div>

            {/* --- CONTENT --- */}

            {/* 1. VUE DESKTOP (Tableau) : Cachée sur mobile */}
            <div className="hidden md:block flex-1 bg-white border border-slate-200 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden flex-col h-full">
                <div className="flex-1 overflow-auto">
                    <TableComponent planes={planesList} setPlanes={setPlanes} />
                </div>
            </div>

            {/* 2. VUE MOBILE (Cartes) : Visible uniquement sur mobile */}
            <div className="block md:hidden pb-10">
                <MobilePlaneList planesList={planesList} setPlanes={setPlanes} />
            </div>

        </div>
    );
};

export default PlanesPage;