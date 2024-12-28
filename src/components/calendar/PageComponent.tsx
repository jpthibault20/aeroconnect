"use client";

import React, { useEffect, useState } from 'react';
import GlobalCalendarDesktop from '@/components/calendar/GlobalCalendarDesktop';
import GlobalCalendarPhone from '@/components/calendar/phone/GlobalCalendarPhone';
import InitialLoading from '@/components/InitialLoading';
import { flight_sessions, planes, User } from '@prisma/client';

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

interface props {
    sessionsprops: flight_sessions[]
    planesProp: planes[]
    usersProps: User[]
    clubIDUrl: string
}

const PageComponent = ({ sessionsprops, planesProp, clubIDUrl, usersProps }: props) => {
    const isMobile = useScreenSize();
    const [sessions, setSessions] = useState<flight_sessions[]>([]);

    useEffect(() => {
        setSessions(sessionsprops);
    }, [sessionsprops]);

    // Rendu conditionnel en fonction de la taille de l'écran
    return (
        <InitialLoading className="h-full w-full" clubIDURL={clubIDUrl}>
            {!isMobile ? (
                <GlobalCalendarDesktop
                    sessions={sessions}
                    setSessions={setSessions}
                    planesProp={planesProp}
                    usersProps={usersProps}
                />
            ) : (
                <GlobalCalendarPhone
                    sessions={sessions}
                    setSessions={setSessions}
                    planesProp={planesProp}
                    usersProps={usersProps}
                />
            )}
        </InitialLoading>
    );
};

export default PageComponent;
