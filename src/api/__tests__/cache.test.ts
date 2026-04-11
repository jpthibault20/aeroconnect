import { describe, it, expect, vi, beforeEach } from "vitest";
import { getFromCache, clearCache } from "@/lib/cache";

describe("Cache", () => {
    beforeEach(async () => {
        // Nettoyer le cache entre chaque test
        await clearCache("test-key");
    });

    describe("getFromCache", () => {
        it("appelle fetchData la première fois", async () => {
            const fetchData = vi.fn().mockResolvedValue({ data: "fresh" });
            const result = await getFromCache("test-key", fetchData);
            expect(fetchData).toHaveBeenCalledOnce();
            expect(result).toEqual({ data: "fresh" });
        });

        it("retourne le cache au deuxième appel sans rappeler fetchData", async () => {
            const fetchData = vi.fn().mockResolvedValue("cached-value");
            await getFromCache("test-key", fetchData);

            const fetchData2 = vi.fn().mockResolvedValue("new-value");
            const result = await getFromCache("test-key", fetchData2);

            expect(fetchData2).not.toHaveBeenCalled();
            expect(result).toBe("cached-value");
        });

        it("rappelle fetchData après expiration du cache", async () => {
            vi.useFakeTimers();
            const fetchData = vi.fn().mockResolvedValue("old");
            await getFromCache("test-key", fetchData);

            // Avancer le temps de 60 minutes (au-delà des 59 min du cache)
            vi.advanceTimersByTime(60 * 60 * 1000);

            const fetchData2 = vi.fn().mockResolvedValue("new");
            const result = await getFromCache("test-key", fetchData2);

            expect(fetchData2).toHaveBeenCalledOnce();
            expect(result).toBe("new");
            vi.useRealTimers();
        });
    });

    describe("clearCache", () => {
        it("supprime une entrée existante", async () => {
            const fetchData = vi.fn().mockResolvedValue("data");
            await getFromCache("test-key", fetchData);
            await clearCache("test-key");

            const fetchData2 = vi.fn().mockResolvedValue("fresh-data");
            const result = await getFromCache("test-key", fetchData2);

            expect(fetchData2).toHaveBeenCalledOnce();
            expect(result).toBe("fresh-data");
        });

        it("ne plante pas sur une clé inexistante", async () => {
            await expect(clearCache("nonexistent")).resolves.toBeUndefined();
        });
    });
});
