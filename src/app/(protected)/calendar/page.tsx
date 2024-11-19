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
    const [loadedMonths, setLoadedMonths] = useState<string[]>([]); // Pour suivre les mois chargés
    const [reload, setReload] = useState(false);
    const [loading, setLoading] = useState(false);
    const [monthSelected, setMonthSelected] = useState(new Date());

    const isMobile = useScreenSize();

    useEffect(() => {
    }, [monthSelected]);

    useEffect(() => {
        const fetchSessions = async () => {
            if (currentUser) {
                try {
                    const monthKey = monthSelected.toISOString().slice(0, 7); // Format "YYYY-MM"

                    // Vérifier si le mois est déjà chargé
                    if (!loadedMonths.includes(monthKey)) {
                        setLoading(true);
                        const res = await getAllSessions(currentUser.clubID, monthSelected);

                        // Vérification de la structure de la réponse
                        if (Array.isArray(res)) {
                            // Ajouter les nouvelles sessions au state
                            setSessions(prevSessions => [...prevSessions, ...res]);
                        } else if (res && typeof res === 'object' && 'error' in res) {
                            console.error(`Error fetching sessions for ${monthKey}:`, res.error);
                        } else {
                            console.warn(`No sessions or unexpected response for ${monthKey}`);
                        }

                        // Ajouter le mois à la liste des mois chargés
                        setLoadedMonths(prevLoadedMonths => [...prevLoadedMonths, monthKey]);
                    }
                } catch (error) {
                    console.error(error);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchSessions();
    }, [currentUser, monthSelected, reload, loadedMonths]);


    // Rendu conditionnel en fonction de la taille de l'écran
    return (
        <InitialLoading className="h-full w-full">
            {!isMobile ? (
                <GlobalCalendarDesktop
                    sessions={sessions}
                    reload={reload}
                    setReload={setReload}
                    loading={loading}
                    setMonthSelected={setMonthSelected}
                />
            ) : (
                <GlobalCalendarPhone
                    sessions={sessions}
                    reload={reload}
                    setReload={setReload}
                    loading={loading}
                    setMonthSelected={setMonthSelected}
                />
            )}
        </InitialLoading>
    );
};

export default Page;
