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
import { useWallet, WalletStatus } from "@/hooks/useWallet";
import { isBookingGatedRole } from "@/lib/wallet";

/** Global (window) event fired when a membership request is handled. */
export const CLUB_REQUESTS_EVENT = "refresh-club-requests";

/** Roles allowed to see pending membership requests. */
const REQUEST_ROLES: userRole[] = [userRole.ADMIN, userRole.OWNER, userRole.MANAGER];

export interface NavigationCounts {
    /** Pending membership requests (management only). */
    requestCount: number;
    /** Planes with at least one overdue maintenance reminder. */
    maintenanceCount: number;
    /** Pending discovery-flight requests the user can handle. */
    baptemeCount: number;
    /** Student / pilot with a zero or negative balance: they can no longer book. */
    walletAlert: boolean;
    /** Balance of the signed-in user (student wallet, AER-66). */
    wallet: WalletStatus;
}

/**
 * Counters of the menu notification badges (sidebar + mobile navbar).
 *
 * Centralized here so the server is queried only once per page: previously each
 * navigation bar made its own calls, and the effects depended on the whole
 * `currentUser` object, which refetched everything on every context update. The
 * server actions do their own access control; client-side only the role is used
 * to skip useless calls.
 */
export function useNavigationCounts(): NavigationCounts {
    const { currentUser } = useCurrentUser();
    const role = currentUser?.role;
    const searchParams = useSearchParams();
    const clubID = searchParams.get("clubID");

    const [requestCount, setRequestCount] = useState(0);
    const [maintenanceCount, setMaintenanceCount] = useState(0);
    const [baptemeCount, setBaptemeCount] = useState(0);

    // Each effect creates its own loader function: used both for the initial call
    // and as the refresh event handler.

    // Membership requests: role dependent (loaded shortly after mount).
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

    // Maintenance: recomputed when a reminder/intervention changes.
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

    // Discovery flights: recomputed when a request is accepted/rejected.
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

    // Wallet: the badge only concerns roles blocked from booking (for management, a
    // negative balance is not a task).
    const wallet = useWallet();
    const walletAlert = wallet.enabled && isBookingGatedRole(role) && wallet.state === "empty";

    return { requestCount, maintenanceCount, baptemeCount, walletAlert, wallet };
}
