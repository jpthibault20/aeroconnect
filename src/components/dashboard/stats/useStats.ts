"use client";

import { useEffect, useState } from "react";

/**
 * Loads a statistic through a server action and reloads when `key` changes
 * (period, mode…). Ignores out-of-order responses.
 */
export function useStats<R extends object>(load: () => Promise<R>, key: string, reloadEvent?: string) {
    const [data, setData] = useState<Extract<R, { success: true }> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (!reloadEvent) return;
        const onReload = () => setTick((t) => t + 1);
        window.addEventListener(reloadEvent, onReload);
        return () => window.removeEventListener(reloadEvent, onReload);
    }, [reloadEvent]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        load()
            .then((res) => {
                if (cancelled) return;
                const result = res as { success?: boolean; error?: string };
                if (result.success) {
                    setError(null);
                    setData(res as Extract<R, { success: true }>);
                } else {
                    setError(result.error ?? "Erreur inconnue");
                    setData(null);
                }
            })
            .catch(() => {
                if (!cancelled) setError("Impossible de charger les statistiques.");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
        // `load` is recreated on every render: only reload on `key`.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, tick]);

    return { data, error, loading };
}
