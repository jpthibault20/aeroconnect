/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

const CACHE_DURATION = 59 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; timestamp: number }>();

export const getFromCache = async (
    cacheKey: string,
    fetchData: () => Promise<any>
) => {
    const now = Date.now();

    if (cache.has(cacheKey)) {
        const { data, timestamp } = cache.get(cacheKey)!;

        // Si les données sont toujours valides, les retourner
        if (now - timestamp < CACHE_DURATION) {
            return data;
        }
    }

    // Sinon, récupérer les nouvelles données
    const data = await fetchData();
    cache.set(cacheKey, { data, timestamp: now });
    return data;
};

export const clearCache = async (cacheKey: string) => {
    if (cache.has(cacheKey)) {
        cache.delete(cacheKey);
    }
};


