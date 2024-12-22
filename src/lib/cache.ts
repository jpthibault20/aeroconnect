/* eslint-disable @typescript-eslint/no-explicit-any */


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
            console.log(`Using cached data for key: ${cacheKey}`);
            return data;
        }
    }

    // Sinon, récupérer les nouvelles données
    console.log(`Fetching new data for key: ${cacheKey}`);
    const data = await fetchData();
    cache.set(cacheKey, { data, timestamp: now });
    return data;
};