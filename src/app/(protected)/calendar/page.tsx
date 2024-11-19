"use client";

import React, { useEffect, useState } from 'react';
import GlobalCalendarDesktop from '@/components/calendar/GlobalCalendarDesktop';
import GlobalCalendarPhone from '@/components/calendar/phone/GlobalCalendarPhone';
import InitialLoading from '@/components/InitialLoading';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { getAllSessions } from '@/api/db/sessions';
import { flight_sessions } from '@prisma/client';

/**
 * Hook personnalisé pour détecter si l'écran est de taille mobile ou desktop.
 */
const useScreenSize = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 1023px)'); // 768px est souvent le seuil pour mobile.
        const handleResize = () => setIsMobile(mediaQuery.matches);

        // Détecter initialement la taille de l'écran
        handleResize();

        // Ajouter un listener pour détecter les changements de taille
        mediaQuery.addEventListener('change', handleResize);

        return () => {
            mediaQuery.removeEventListener('change', handleResize);
        };
    }, []);

    return isMobile;
};

/**
 * @function Page
 * @brief Composant principal qui rend une vue calendrier responsive.
 *
 * Affiche `GlobalCalendarDesktop` pour les écrans larges et
 * `GlobalCalendarPhone` pour les écrans mobiles.
 */
const Page = () => {
    const { currentUser } = useCurrentUser();
    const [sessions, setSessions] = useState<flight_sessions[]>([]);
    const [reload, setReload] = useState(false);
    const [loading, setLoading] = useState(false);

    const isMobile = useScreenSize(); // Utilisation du hook pour détecter le type d'écran.

    useEffect(() => {
        const fetchSessions = async () => {
            if (currentUser) {
                try {
                    setLoading(true);
                    const res = await getAllSessions(currentUser.clubID);
                    if (Array.isArray(res)) {
                        setSessions(res);
                    } else {
                        console.error('Unexpected response format:', res);
                    }
                } catch (error) {
                    console.error(error);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchSessions();
    }, [currentUser, reload]);

    // Rendu conditionnel en fonction de la taille de l'écran
    return (
        <InitialLoading className="h-full w-full">
            {!isMobile ? (
                <GlobalCalendarDesktop
                    sessions={sessions}
                    reload={reload}
                    setReload={setReload}
                    loading={loading}
                />
            ) : (
                <GlobalCalendarPhone
                    sessions={sessions}
                    reload={reload}
                    setReload={setReload}
                    loading={loading}
                />
            )}
        </InitialLoading>
    );
};

export default Page;
