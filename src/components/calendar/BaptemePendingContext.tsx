"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { flight_sessions } from "@prisma/client";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { getPendingBaptemeRequestsBySessions } from "@/api/db/bapteme";
import { BAPTEME_HOLD_STUDENT_ID, canValidateBapteme } from "@/lib/bapteme";
import type { PendingBaptemeItem } from "@/components/dashboard/PendingBaptemeRequests";

/**
 * Cache des demandes de baptême en attente, indexé par créneau.
 *
 * Sans lui, la popup d'un créneau doit attendre un aller-retour serveur avant
 * d'afficher le bloc de validation — le pilote ouvre le vol et ne voit d'abord
 * rien. Le calendrier précharge donc en arrière-plan, et UNIQUEMENT sur la
 * plage réellement affichée (semaine sur ordinateur, jour sur téléphone) : rien
 * ne sert de scanner les deux ans de créneaux gardés en mémoire.
 *
 * Trois états par créneau :
 *  - absent du cache  => encore inconnu (la popup déclenche alors sa propre requête) ;
 *  - null             => interrogé, rien à valider ici ;
 *  - PendingBaptemeItem => demande en attente que l'utilisateur peut traiter.
 */
type BaptemeEntry = PendingBaptemeItem | null;

interface BaptemePendingValue {
    /** undefined tant que le créneau n'a pas été interrogé. */
    get: (sessionID: string) => BaptemeEntry | undefined;
    /** Charge en arrière-plan les créneaux encore inconnus. */
    prefetch: (sessionIDs: string[]) => void;
    /** Marque un créneau comme traité (demande validée / refusée). */
    resolve: (sessionID: string) => void;
}

// Valeur par défaut inerte : SessionPopup sert aussi hors du calendrier
// (page « Vols »), où il n'y a pas de préchargement — la popup retombe alors
// sur son chargement à l'ouverture.
const noop: BaptemePendingValue = {
    get: () => undefined,
    prefetch: () => { },
    resolve: () => { },
};

const BaptemePendingContext = createContext<BaptemePendingValue>(noop);

export const useBaptemePending = () => useContext(BaptemePendingContext);

export const BaptemePendingProvider = ({ children }: { children: React.ReactNode }) => {
    const [entries, setEntries] = useState<Record<string, BaptemeEntry>>({});
    // Requêtes en vol : évite qu'un changement de semaine pendant le chargement
    // ne redemande les mêmes créneaux.
    const inFlight = useRef<Set<string>>(new Set());
    // Miroir du cache, lu dans `prefetch` sans le remettre en dépendance : la
    // fonction doit rester stable, sinon les effets qui l'appellent rebouclent.
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
                // Tout créneau interrogé est mémorisé, même sans demande : c'est
                // ce qui distingue « rien à valider » de « pas encore chargé ».
                const next: Record<string, BaptemeEntry> = {};
                missing.forEach((id) => { next[id] = null; });
                if (Array.isArray(res)) {
                    res.forEach((item) => { next[item.sessionID] = item; });
                    setEntries((prev) => ({ ...prev, ...next }));
                }
                // En cas d'erreur serveur on ne mémorise rien : la popup
                // retentera à l'ouverture plutôt que d'afficher un faux « vide ».
            } finally {
                missing.forEach((id) => inFlight.current.delete(id));
            }
        })();
    }, []);

    const resolve = useCallback((sessionID: string) => {
        setEntries((prev) => ({ ...prev, [sessionID]: null }));
    }, []);

    // `get` est volontairement recréé à chaque mise à jour du cache : c'est ce
    // qui change l'identité de la valeur de contexte et re-rend les popups
    // ouvertes quand le préchargement arrive. Il se lit pendant le rendu, jamais
    // en dépendance d'effet (contrairement à `prefetch`, resté stable).
    const value = useMemo(
        () => ({ get: (sessionID: string) => entries[sessionID], prefetch, resolve }),
        [entries, prefetch, resolve]
    );

    return (
        <BaptemePendingContext.Provider value={value}>{children}</BaptemePendingContext.Provider>
    );
};

/**
 * Créneaux de `sessions` tenus par une demande de baptême que l'utilisateur
 * courant peut traiter (pilote assigné ou gestion). Ce tri côté client évite
 * toute requête quand il n'y a rien à valider — le cas normal ; le serveur
 * revérifie les droits sur ce qu'il renvoie.
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
 * Précharge, en arrière-plan, les demandes portant sur les créneaux affichés.
 * À appeler depuis une vue calendrier en lui passant SES sessions visibles.
 */
export const useBaptemePrefetch = (visibleSessions: flight_sessions[]) => {
    const { prefetch } = useBaptemePending();
    const sessionIDs = useValidatableBaptemeSessionIDs(visibleSessions);
    // Clé stable : `sessionIDs` est un nouveau tableau à chaque rendu.
    const key = sessionIDs.join(",");

    useEffect(() => {
        if (key === "") return;
        prefetch(key.split(","));
    }, [key, prefetch]);
};
