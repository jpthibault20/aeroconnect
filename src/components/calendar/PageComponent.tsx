"use client";

import React, { useEffect, useState } from 'react';
import GlobalCalendarDesktop from '@/components/calendar/GlobalCalendarDesktop';
import GlobalCalendarPhone from '@/components/calendar/phone/GlobalCalendarPhone';
import InitialLoading from '@/components/InitialLoading';
import { flight_sessions, planes, User } from '@prisma/client';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { resolveOfferedClasses } from '@/lib/planeVisibility';
import { BaptemePendingProvider } from '@/components/calendar/BaptemePendingContext';

/**
 * Detects whether the screen is mobile or desktop sized.
 */
const useScreenSize = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 1023px)');
        const handleResize = () => setIsMobile(mediaQuery.matches);

        handleResize();

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
    const { currentUser } = useCurrentUser();
    const userClasses = currentUser?.classes;
    // Visible sessions: those offering at least one of the user's classes.
    const filterSessions = () => sessionsprops.filter((s) => {
        const offeredClasses = resolveOfferedClasses(s.planeID, s.classes, planesProp);
        return userClasses?.some(cls => offeredClasses.includes(cls));
    });
    const [sessions, setSessions] = useState<flight_sessions[]>(filterSessions);

    // Sources changed: recompute the list (adjusted during render rather than in an
    // effect). Local mutations via setSessions stay possible between source changes.
    const [prevSources, setPrevSources] = useState({ sessionsprops, planesProp, userClasses });
    if (
        prevSources.sessionsprops !== sessionsprops ||
        prevSources.planesProp !== planesProp ||
        prevSources.userClasses !== userClasses
    ) {
        setPrevSources({ sessionsprops, planesProp, userClasses });
        setSessions(filterSessions());
    }


    return (
        <InitialLoading className="h-full w-full" clubIDURL={clubIDUrl}>
            {/* Cache of pending discovery-flight requests, prefetched by each view for its own displayed range (week / day). */}
            <BaptemePendingProvider>
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
            </BaptemePendingProvider>
        </InitialLoading>
    );
};

export default PageComponent;
