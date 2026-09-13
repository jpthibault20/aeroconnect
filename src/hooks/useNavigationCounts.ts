"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { userRole } from "@prisma/client";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { getAllUserRequestedClubID } from "@/api/db/club";
import { getMaintenanceAlerts } from "@/api/db/maintenance";
import { getPendingBaptemeCount } from "@/api/db/bapteme";
import { MAINTENANCE_ALERTS_EVENT } from "@/lib/maintenanceEvents";
import { BAPTEME_REQUESTS_EVENT } from "@/lib/baptemeEvents";

/** Événement global (window) émis quand une demande d'adhésion est traitée. */
export const CLUB_REQUESTS_EVENT = "refresh-club-requests";

/** Rôles autorisés à voir les demandes d'adhésion en attente. */
const REQUEST_ROLES: userRole[] = [userRole.ADMIN, userRole.OWNER, userRole.MANAGER];

export interface NavigationCounts {
    /** Demandes d'adhésion en attente (gestion uniquement). */
    requestCount: number;
    /** Machines ayant au moins un rappel de maintenance en retard. */
    maintenanceCount: number;
    /** Demandes de baptême en attente que l'utilisateur peut traiter. */
    baptemeCount: number;
}

/**
 * Compteurs des bulles de notification du menu (sidebar + navbar mobile).
 *
 * Centralisé ici pour n'interroger le serveur qu'une seule fois par page :
 * auparavant chaque barre de navigation lançait ses propres appels, et les
 * effets dépendaient de l'objet `currentUser` entier, ce qui relançait tout à
 * chaque mise à jour du contexte. Les server actions font elles-mêmes le
 * contrôle d'accès ; côté client seul le rôle sert à éviter un appel inutile.
 */
export function useNavigationCounts(): NavigationCounts {
    const { currentUser } = useCurrentUser();
    const role = currentUser?.role;
    const searchParams = useSearchParams();
    const clubID = searchParams.get("clubID");

    const [requestCount, setRequestCount] = useState(0);
    const [maintenanceCount, setMaintenanceCount] = useState(0);
    const [baptemeCount, setBaptemeCount] = useState(0);

    // Chaque effet crée sa propre fonction de chargement : elle sert à la fois
    // à l'appel initial et de handler pour l'événement de rafraîchissement.

    // Demandes d'adhésion : dépend du rôle (chargé un peu après le montage).
    useEffect(() => {
        const canManage = !!role && REQUEST_ROLES.includes(role);
        if (!clubID || !canManage) return;

        const fetchRequests = async () => {
            try {
                const requests = await getAllUserRequestedClubID(clubID);
                if (Array.isArray(requests)) setRequestCount(requests.length);
            } catch {
            }
        };

        fetchRequests();
        window.addEventListener(CLUB_REQUESTS_EVENT, fetchRequests);
        return () => window.removeEventListener(CLUB_REQUESTS_EVENT, fetchRequests);
    }, [clubID, role]);

    // Maintenance : recalcul quand un rappel/une intervention change.
    useEffect(() => {
        if (!clubID) return;

        const fetchAlerts = async () => {
            try {
                const res = await getMaintenanceAlerts(clubID);
                setMaintenanceCount(res.count);
            } catch {
            }
        };

        fetchAlerts();
        window.addEventListener(MAINTENANCE_ALERTS_EVENT, fetchAlerts);
        return () => window.removeEventListener(MAINTENANCE_ALERTS_EVENT, fetchAlerts);
    }, [clubID]);

    // Baptêmes : recalcul quand une demande est validée/refusée.
    useEffect(() => {
        if (!clubID) return;

        const fetchBaptemes = async () => {
            try {
                const res = await getPendingBaptemeCount(clubID);
                setBaptemeCount(res.count);
            } catch {
            }
        };

        fetchBaptemes();
        window.addEventListener(BAPTEME_REQUESTS_EVENT, fetchBaptemes);
        return () => window.removeEventListener(BAPTEME_REQUESTS_EVENT, fetchBaptemes);
    }, [clubID]);

    return { requestCount, maintenanceCount, baptemeCount };
}
