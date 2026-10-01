/**
 * @file PlanesPage.tsx
 * @brief Component for displaying and managing the fleet of planes.
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import TableComponent from './TableComponent';
import MobilePlaneList from './MobilePlaneList';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { planes } from '@prisma/client';
import NewPlane from './NewPlane';
import Header from './Header';
import { canCreateAnyPlane } from '@/lib/planeVisibility';
import { getMaintenanceAlerts } from '@/api/db/maintenance';
import { MAINTENANCE_ALERTS_EVENT } from '@/lib/maintenanceEvents';

interface Props {
    PlanesProps: planes[];
    // Map ownerID -> "Firstname Lastname", only provided for president/admin (the
    // only ones who see other members' private planes).
    ownerNames?: Record<string, string>;
}

const PlanesPage = ({ PlanesProps, ownerNames }: Props) => {
    const { currentUser } = useCurrentUser();
    const [planesList, setPlanes] = useState<planes[]>(PlanesProps);
    // The server map only knows the owners present at render time: it is completed
    // client-side when a plane is reassigned to another member.
    const [ownerNamesState, setOwnerNamesState] = useState<Record<string, string>>(ownerNames ?? {});

    const registerOwnerName = useCallback((ownerID: string, ownerName: string) => {
        setOwnerNamesState((prev) => (prev[ownerID] === ownerName ? prev : { ...prev, [ownerID]: ownerName }));
    }, []);
    // IDs of planes with at least one overdue maintenance reminder (among those
    // whose maintenance the user sees).
    const [overduePlaneIDs, setOverduePlaneIDs] = useState<string[]>([]);

    // Any member (except the base USER role) can add at least a private plane;
    // management can also create club planes.
    const canCreate = !!currentUser && canCreateAnyPlane(currentUser.role);

    const clubID = currentUser?.clubID;

    useEffect(() => {
        if (!clubID) return;
        let cancelled = false;
        const fetchOverdue = async () => {
            try {
                const res = await getMaintenanceAlerts(clubID);
                if (!cancelled) setOverduePlaneIDs(res.overduePlaneIDs);
            } catch {
                // Non-blocking: the "overdue maintenance" badge is informational, the
                // maintenance dialog shows the detailed state.
            }
        };
        void fetchOverdue();
        // Recompute after any maintenance change (from the dialog).
        window.addEventListener(MAINTENANCE_ALERTS_EVENT, fetchOverdue);
        return () => {
            cancelled = true;
            window.removeEventListener(MAINTENANCE_ALERTS_EVENT, fetchOverdue);
        };
    }, [clubID]);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 p-4 md:p-8 font-sans">

            {/* --- TOP BAR: title & actions --- */}
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

            {/* 1. DESKTOP VIEW (table): hidden on mobile */}
            <div className="hidden md:block flex-1 bg-white border border-slate-200 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden flex-col h-full">
                <div className="flex-1 overflow-auto">
                    <TableComponent planes={planesList} setPlanes={setPlanes} ownerNames={ownerNamesState} onOwnerNameResolved={registerOwnerName} overduePlaneIDs={overduePlaneIDs} />
                </div>
            </div>

            {/* 2. MOBILE VIEW (cards): mobile only */}
            <div className="block md:hidden pb-10">
                <MobilePlaneList planesList={planesList} setPlanes={setPlanes} ownerNames={ownerNamesState} onOwnerNameResolved={registerOwnerName} overduePlaneIDs={overduePlaneIDs} />
            </div>

        </div>
    );
};

export default PlanesPage;