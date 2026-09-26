"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { getMyWalletStatus } from "@/api/db/wallet";
import { BalanceState } from "@/lib/wallet";
import { WALLET_EVENT } from "@/lib/walletEvents";

export interface WalletStatus {
    /** Wallet enabled for the current club. */
    enabled: boolean;
    /** Balance of the signed-in user (cents), null until loaded. */
    balanceCents: number | null;
    lowThresholdCents: number | null;
    state: BalanceState | null;
}

type StatusResult = Awaited<ReturnType<typeof getMyWalletStatus>>;

// A single server call shared by every mounted component (menu, calendar,
// booking dialog…); invalidated on every WALLET_EVENT.
let shared: { key: string; promise: Promise<StatusResult> } | null = null;

function loadStatus(key: string): Promise<StatusResult> {
    if (!shared || shared.key !== key) {
        shared = { key, promise: getMyWalletStatus() };
    }
    return shared.promise;
}

if (typeof window !== "undefined") {
    window.addEventListener(WALLET_EVENT, () => { shared = null; });
}

/**
 * Balance of the signed-in user. Makes no call if the club has not enabled the
 * wallet (the whole wallet UI then stays hidden).
 */
export function useWallet(): WalletStatus {
    const { currentUser } = useCurrentUser();
    const { currentClub } = useCurrentClub();
    const enabled = !!currentClub?.walletEnabled;
    const key = `${currentUser?.id ?? ""}:${currentClub?.id ?? ""}`;

    const [status, setStatus] = useState<Omit<WalletStatus, "enabled">>({
        balanceCents: null, lowThresholdCents: null, state: null,
    });

    useEffect(() => {
        if (!enabled || !currentUser?.id) return;
        let cancelled = false;

        const fetchStatus = async () => {
            try {
                const res = await loadStatus(key);
                if (cancelled || "error" in res || !res.enabled) return;
                setStatus({ balanceCents: res.balanceCents, lowThresholdCents: res.lowThresholdCents, state: res.state });
            } catch {
            }
        };

        fetchStatus();
        window.addEventListener(WALLET_EVENT, fetchStatus);
        return () => {
            cancelled = true;
            window.removeEventListener(WALLET_EVENT, fetchStatus);
        };
    }, [enabled, key, currentUser?.id]);

    return { enabled, ...status };
}
