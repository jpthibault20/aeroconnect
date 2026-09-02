/**
 * @file PlanesPage.tsx
 * @brief Component for displaying and managing the fleet of planes.
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import TableComponent from './TableComponent';
import MobilePlaneList from './MobilePlaneList'; // <-- IMPORT DU NOUVEAU COMPOSANT
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { planes } from '@prisma/client';
import NewPlane from './NewPlane';
import Header from './Header';
import { canCreateAnyPlane } from '@/lib/planeVisibility';
import { getMaintenanceAlerts } from '@/api/db/maintenance';
import { MAINTENANCE_ALERTS_EVENT } from '@/lib/maintenanceEvents';

interface Props {
    PlanesProps: planes[];
    // Map ownerID -> "Prénom Nom", fournie uniquement pour président/admin
    // (les seuls à voir les machines privées des autres membres).
    ownerNames?: Record<string, string>;
}

const PlanesPage = ({ PlanesProps, ownerNames }: Props) => {
    const { currentUser } = useCurrentUser();
    const [planesList, setPlanes] = useState<planes[]>(PlanesProps);
    // La map serveur ne connaît que les propriétaires présents au rendu : on la
    // complète côté client quand une machine est réattribuée à un autre membre.
    const [ownerNamesState, setOwnerNamesState] = useState<Record<string, string>>(ownerNames ?? {});

    const registerOwnerName = useCallback((ownerID: string, ownerName: string) => {
        setOwnerNamesState((prev) => (prev[ownerID] === ownerName ? prev : { ...prev, [ownerID]: ownerName }));
    }, []);
    // IDs des avions ayant au moins un rappel de maintenance en retard (parmi
    // ceux dont l'utilisateur voit la maintenance).
    const [overduePlaneIDs, setOverduePlaneIDs] = useState<string[]>([]);

    // Tout membre (sauf le rôle USER de base) peut ajouter au moins une machine
    // privée ; les gestionnaires peuvent en plus créer des machines du club.
    const canCreate = !!currentUser && canCreateAnyPlane(currentUser.role);

    const fetchOverdue = useCallback(async () => {
        if (!currentUser?.clubID) return;
        try {
            const res = await getMaintenanceAlerts(currentUser.clubID);
            setOverduePlaneIDs(res.overduePlaneIDs);
        } catch {
        }
    }, [currentUser?.clubID]);

    useEffect(() => {
        fetchOverdue();
        // Recalcul après toute modification de maintenance (via la modale).
        window.addEventListener(MAINTENANCE_ALERTS_EVENT, fetchOverdue);
        return () => window.removeEventListener(MAINTENANCE_ALERTS_EVENT, fetchOverdue);
    }, [fetchOverdue]);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 p-4 md:p-8 font-sans">

            {/* --- TOP BAR: Titre & Actions --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">

                <div className="flex-1">
                    <Header planesLenght={planesList.length} />
                </div>

                {canCreate && (
                    <div className="shrink-0 w-full md:w-auto">
                        <NewPlane setPlanes={setPlanes} />
                    </div>
                )}
            </div>

            {/* --- CONTENT --- */}

            {/* 1. VUE DESKTOP (Tableau) : Cachée sur mobile */}
            <div className="hidden md:block flex-1 bg-white border border-slate-200 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden flex-col h-full">
                <div className="flex-1 overflow-auto">
                    <TableComponent planes={planesList} setPlanes={setPlanes} ownerNames={ownerNamesState} onOwnerNameResolved={registerOwnerName} overduePlaneIDs={overduePlaneIDs} />
                </div>
            </div>

            {/* 2. VUE MOBILE (Cartes) : Visible uniquement sur mobile */}
            <div className="block md:hidden pb-10">
                <MobilePlaneList planesList={planesList} setPlanes={setPlanes} ownerNames={ownerNamesState} onOwnerNameResolved={registerOwnerName} overduePlaneIDs={overduePlaneIDs} />
            </div>

        </div>
    );
};

export default PlanesPage;