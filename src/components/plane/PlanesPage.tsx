/**
 * @file PlanesPage.tsx
 * @brief Component for displaying and managing the fleet of planes.
 * @details
 * Updated to match the "Aero Connect" modern dashboard design.
 * Uses CSS flexbox for layout instead of JS height calculation for better performance.
 */

"use client";

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

    // Note: J'ai retiré useViewportHeight. 
    // Utiliser 'min-h-screen' et 'h-full' en CSS est plus performant et évite les sauts d'image.

    const canEdit = currentUser?.role === userRole.ADMIN ||
        currentUser?.role === userRole.OWNER ||
        currentUser?.role === userRole.MANAGER;

    return (
        // Fond Slate-50 pour la cohérence globale
        <div className="flex flex-col min-h-screen bg-slate-50 p-6 md:p-8 font-sans">

            {/* --- TOP BAR: Titre & Actions --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">

                {/* Le Header (Titre + Compteur) */}
                {/* Astuce: Si ton composant Header contient juste du texte, 
                    assure-toi qu'il n'a pas de marges énormes pour qu'il s'aligne bien avec le bouton */}
                <div className="flex-1">
                    <Header planesLenght={planes.length} />
                </div>

                {/* Bouton d'action (Aligné à droite sur desktop) */}
                {canEdit && (
                    <div className="shrink-0">
                        <NewPlane setPlanes={setPlanes} />
                    </div>
                )}
            </div>

            {/* --- CONTENT CARD --- */}
            {/* Le tableau vit dans cette carte blanche pour l'effet "Dashboard Pro" */}
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">

                {/* Zone défilante pour le tableau */}
                {/* On s'assure que le tableau prend toute la hauteur dispo dans la carte */}
                <div className="flex-1 overflow-auto">
                    <TableComponent planes={planes} setPlanes={setPlanes} />
                </div>
            </div>
        </div>
    );
};

export default PlanesPage;