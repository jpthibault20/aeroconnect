"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { flight_sessions } from "@prisma/client";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { getPendingBaptemeRequestsBySessions } from "@/api/db/bapteme";
import { BAPTEME_HOLD_STUDENT_ID, canValidateBapteme } from "@/lib/bapteme";
import type { PendingBaptemeItem } from "@/components/dashboard/PendingBaptemeRequests";

/**
 * Cache of pending discovery-flight requests, keyed by slot.
 *
 * Without it, a slot's popup has to wait for a server round trip before showing
 * the validation block: the pilot opens the flight and first sees nothing. The
 * calendar therefore prefetches in the background, and ONLY for the range
 * actually displayed (week on desktop, day on phone): no point scanning the two
 * years of slots kept in memory.
 *
 * Three states per slot:
 *  - absent from the cache => still unknown (the popup then fires its own request);
 *  - null                 => queried, nothing to validate here;
 *  - PendingBaptemeItem   => pending request the user can handle.
 */
type BaptemeEntry = PendingBaptemeItem | null;

interface BaptemePendingValue {
    /** undefined until the slot has been queried. */
    get: (sessionID: string) => BaptemeEntry | undefined;
    /** Loads the still-unknown slots in the background. */
    prefetch: (sessionIDs: string[]) => void;
    /** Marks a slot as handled (request accepted / rejected). */
    resolve: (sessionID: string) => void;
}

// Inert default: SessionPopup is also used outside the calendar ("Flights"
// page), where there is no prefetch; the popup then falls back to loading on open.
const noop: BaptemePendingValue = {
    get: () => undefined,
    prefetch: () => { },
    resolve: () => { },
};

const BaptemePendingContext = createContext<BaptemePendingValue>(noop);

export const useBaptemePending = () => useContext(BaptemePendingContext);

export const BaptemePendingProvider = ({ children }: { children: React.ReactNode }) => {
    const [entries, setEntries] = useState<Record<string, BaptemeEntry>>({});
    // In-flight requests: prevents a week change during loading from requesting the
    // same slots again.
    const inFlight = useRef<Set<string>>(new Set());
    // Mirror of the cache, read in `prefetch` without making it a dependency: the
    // function must stay stable, otherwise the effects calling it loop.
    const entriesRef = useRef(entries);
    entriesRef.current = entries;

    const prefetch = useCallback((sessionIDs: string[]) => {
        const missing = sessionIDs.filter(
            (id) => !(id in entriesRef.current) && !inFlight.current.has(id)
        );
        if (missing.length === 0) return;

        missing.forEach((id) => inFlight.current.add(id));
        (async () => {
            try {
                const res = await getPendingBaptemeRequestsBySessions(missing);
                // Every queried slot is remembered, even without a request: that is what tells
                // "nothing to validate" apart from "not loaded yet".
                const next: Record<string, BaptemeEntry> = {};
                missing.forEach((id) => { next[id] = null; });
                if (Array.isArray(res)) {
                    res.forEach((item) => { next[item.sessionID] = item; });
                    setEntries((prev) => ({ ...prev, ...next }));
                }
                // On server error nothing is stored: the popup retries on open rather than
                // showing a false "empty".
            } finally {
                missing.forEach((id) => inFlight.current.delete(id));
            }
        })();
    }, []);

    const resolve = useCallback((sessionID: string) => {
        setEntries((prev) => ({ ...prev, [sessionID]: null }));
    }, []);

    // `get` is deliberately recreated on every cache update: that changes the
    // context value's identity and re-renders open popups when the prefetch lands.
    // It is read during render, never as an effect dependency (unlike `prefetch`,
    // which stays stable).
    const value = useMemo(
        () => ({ get: (sessionID: string) => entries[sessionID], prefetch, resolve }),
        [entries, prefetch, resolve]
    );

    return (
        <BaptemePendingContext.Provider value={value}>{children}</BaptemePendingContext.Provider>
    );
};

/**
 * Slots of `sessions` held by a discovery-flight request the current user can
 * handle (assigned pilot or management). This client-side filter avoids any
 * request when there is nothing to validate (the normal case); the server
 * rechecks rights on what it returns.
 */
export const useValidatableBaptemeSessionIDs = (sessions: flight_sessions[]) => {
    const { currentUser } = useCurrentUser();
    return useMemo(() => {
        if (!currentUser) return [];
        return sessions
            .filter(
                (s) =>
                    s.studentID === BAPTEME_HOLD_STUDENT_ID &&
                    canValidateBapteme(currentUser, { pilotID: s.pilotID })
            )
            .map((s) => s.id);
    }, [sessions, currentUser]);
};

/**
 * Prefetches, in the background, the requests on the displayed slots.
 * Call it from a calendar view with ITS visible sessions.
 */
export const useBaptemePrefetch = (visibleSessions: flight_sessions[]) => {
    const { prefetch } = useBaptemePending();
    const sessionIDs = useValidatableBaptemeSessionIDs(visibleSessions);
    // Stable key: `sessionIDs` is a new array on every render.
    const key = sessionIDs.join(",");

    useEffect(() => {
        if (key === "") return;
        prefetch(key.split(","));
    }, [key, prefetch]);
};
