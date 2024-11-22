/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useEffect, useState } from 'react';
import GlobalCalendarDesktop from '@/components/calendar/GlobalCalendarDesktop';
import GlobalCalendarPhone from '@/components/calendar/phone/GlobalCalendarPhone';
import InitialLoading from '@/components/InitialLoading';
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

interface props { sessionsprops: flight_sessions[] }

const PageComponent = ({ sessionsprops }: props) => {

    const isMobile = useScreenSize();

    const [reload, setReload] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sessions, setSessions] = useState<flight_sessions[]>([]);

    useEffect(() => {
        setSessions(sessionsprops);
    }, [sessionsprops]);


    // Rendu conditionnel en fonction de la taille de l'écran
    return (
        <InitialLoading className="h-full w-full">
            {!isMobile ? (
                <GlobalCalendarDesktop
                    sessions={sessions}
                    setSessions={setSessions}
                    reload={reload}
                    setReload={setReload}
                    loading={loading}
                />
            ) : (
                <GlobalCalendarPhone
                    sessions={sessions}
                    // setSessions={setSessions}
                    reload={reload}
                    setReload={setReload}
                    loading={loading}
                />
            )}
        </InitialLoading>
    );
};

export default PageComponent;
