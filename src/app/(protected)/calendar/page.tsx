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
    console.log("Page | Rendering...");
    const { currentUser } = useCurrentUser();
    const [sessions, setSessions] = useState<flight_sessions[]>([]);
    const [loadedMonths, setLoadedMonths] = useState<string[]>([]); // Pour suivre les mois chargés
    const [reload, setReload] = useState(false);
    const [loading, setLoading] = useState(false);
    const [monthSelected, setMonthSelected] = useState(new Date());

    const isMobile = useScreenSize();

    useEffect(() => {
        if (!currentUser) return;

        const fetchSessions = async () => {
            const monthKey = monthSelected.toISOString().slice(0, 7);

            // Vérifiez si le mois est déjà chargé
            if (!loadedMonths.includes(monthKey)) {
                try {
                    setLoading(true);

                    const res = await getAllSessions(currentUser.clubID, monthSelected);

                    if (Array.isArray(res)) {
                        setSessions((prevSessions) => {
                            const newSessions = res.filter(
                                (session) => !prevSessions.some((prev) => prev.id === session.id)
                            );
                            return [...prevSessions, ...newSessions];
                        });
                        setLoadedMonths((prevLoadedMonths) => [...prevLoadedMonths, monthKey]);
                    } else if (res && typeof res === "object" && "error" in res) {
                        console.error(`Error fetching sessions for ${monthKey}:`, res.error);
                    }
                } catch (error) {
                    console.error(error);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchSessions();
    }, [currentUser, monthSelected]); // Simplifie les dépendances


    // Effet pour recharger les sessions au changement de `reload`
    useEffect(() => {
        const reloadSessions = async () => {
            if (currentUser) {
                try {
                    setLoading(true);
                    const res = await getAllSessions(currentUser.clubID, monthSelected);

                    if (Array.isArray(res)) {
                        setSessions(res); // Écrase les sessions existantes
                    } else if (res && typeof res === "object" && "error" in res) {
                        console.error(`Error reloading sessions:`, res.error);
                    }
                } catch (error) {
                    console.error(error);
                } finally {
                    setLoading(false);
                }
            }
        };

        reloadSessions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reload]); // S'exécute uniquement lorsque `reload` change


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
