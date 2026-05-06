"use client";

import React, { useState, useEffect, useCallback } from "react";
import { flight_logs } from "@prisma/client";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { getIncompleteFlightLogs, autoCreateLogsFromSessions, getPlaneHobbs } from "@/api/db/logbook";
import CompleteFlightDialog from "./CompleteFlightDialog";

/**
 * Ce composant s'affiche automatiquement à l'ouverture de l'app
 * s'il y a des vols non signés pour l'utilisateur courant.
 * Il gère une file : quand l'utilisateur complète un vol,
 * le suivant s'affiche automatiquement.
 */
const PendingFlightsPrompt = () => {
    const { currentUser } = useCurrentUser();
    const { currentClub } = useCurrentClub();
    const [queue, setQueue] = useState<flight_logs[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [open, setOpen] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [planeHobbsMap, setPlaneHobbsMap] = useState<Record<string, number>>({});

    // Charger les vols incomplets au montage
    useEffect(() => {
        if (!currentUser?.id || !currentClub?.id || loaded) return;

        const load = async () => {
            // S'assurer que les flight_logs sont créés depuis les sessions passées
            await autoCreateLogsFromSessions(currentClub.id);

            const res = await getIncompleteFlightLogs(currentUser.id, currentClub.id);
            if ("error" in res || !res.logs) return;

            if (res.logs.length > 0) {
                // Récupérer le hobbsTotal de chaque avion concerné
                const uniquePlaneIDs = [...new Set(res.logs.map(l => l.planeID).filter((id): id is string => !!id))];
                const hobbsEntries = await Promise.all(
                    uniquePlaneIDs.map(async (id) => {
                        const hobbs = await getPlaneHobbs(id);
                        return [id, hobbs] as const;
                    })
                );
                const hobbsMap: Record<string, number> = {};
                for (const [id, hobbs] of hobbsEntries) {
                    if (hobbs != null) hobbsMap[id] = hobbs;
                }
                setPlaneHobbsMap(hobbsMap);

                setQueue(res.logs);
                setCurrentIndex(0);
                setOpen(true);
            }
            setLoaded(true);
        };

        // Petit délai pour ne pas bloquer le premier rendu
        const timeout = setTimeout(load, 1500);
        return () => clearTimeout(timeout);
    }, [currentUser?.id, currentClub?.id, loaded]);

    const currentLog = queue[currentIndex] ?? null;

    const handleCompleted = useCallback(() => {
        const nextIndex = currentIndex + 1;
        if (nextIndex < queue.length) {
            // Vol suivant dans la file
            setCurrentIndex(nextIndex);
        } else {
            // Tous les vols sont complétés
            setOpen(false);
        }
    }, [currentIndex, queue.length]);

    const handleOpenChange = useCallback((isOpen: boolean) => {
        setOpen(isOpen);
        // Si l'utilisateur ferme, on ne relance pas
    }, []);

    if (!currentLog || !open) return null;

    const queueInfo = queue.length > 1
        ? `Vol ${currentIndex + 1} sur ${queue.length} à compléter`
        : undefined;

    const defaultAirfield = currentClub?.id ?? undefined;
    const defaultHobbsStart = currentLog.planeID ? planeHobbsMap[currentLog.planeID] : undefined;

    return (
        <CompleteFlightDialog
            log={currentLog}
            open={open}
            onOpenChange={handleOpenChange}
            onCompleted={handleCompleted}
            queueInfo={queueInfo}
            defaultAirfield={defaultAirfield}
            defaultHobbsStart={defaultHobbsStart}
        />
    );
};

export default PendingFlightsPrompt;
