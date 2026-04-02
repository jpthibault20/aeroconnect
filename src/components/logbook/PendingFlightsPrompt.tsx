"use client";

import React, { useState, useEffect, useCallback } from "react";
import { flight_logs } from "@prisma/client";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { getIncompleteFlightLogs } from "@/api/db/logbook";
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

    // Charger les vols incomplets au montage
    useEffect(() => {
        if (!currentUser?.id || !currentClub?.id || loaded) return;

        const load = async () => {
            const res = await getIncompleteFlightLogs(currentUser.id, currentClub.id);
            if ("error" in res || !res.logs) return;

            if (res.logs.length > 0) {
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

    return (
        <CompleteFlightDialog
            log={currentLog}
            open={open}
            onOpenChange={handleOpenChange}
            onCompleted={handleCompleted}
            queueInfo={queueInfo}
        />
    );
};

export default PendingFlightsPrompt;
