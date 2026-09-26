import { describe, it, expect } from "vitest";
import { CLUB_TIME_ZONE, toClubWallClock } from "@/lib/clubTime";

/**
 * These tests pass whatever the runner's time zone: `toClubWallClock` always gets
 * an explicit time zone, and the expected values are absolute UTC instants.
 */
describe("toClubWallClock", () => {
    it("applique l'heure d'été (Paris = UTC+2 en août)", () => {
        expect(toClubWallClock(new Date("2026-08-12T12:00:00.000Z"), "Europe/Paris").toISOString())
            .toBe("2026-08-12T14:00:00.000Z");
    });

    it("applique l'heure d'hiver (Paris = UTC+1 en janvier)", () => {
        expect(toClubWallClock(new Date("2026-01-15T12:00:00.000Z"), "Europe/Paris").toISOString())
            .toBe("2026-01-15T13:00:00.000Z");
    });

    it("est l'identité pour un club en UTC", () => {
        const instant = new Date("2026-08-12T12:00:00.000Z");
        expect(toClubWallClock(instant, "UTC").toISOString()).toBe(instant.toISOString());
    });

    it("passe au jour suivant sans rendre « 24:00 » (minuit à Paris)", () => {
        // 22:00Z in August = 00:00 on the 13th in Paris.
        expect(toClubWallClock(new Date("2026-08-12T22:00:00.000Z"), "Europe/Paris").toISOString())
            .toBe("2026-08-13T00:00:00.000Z");
    });

    it("conserve les secondes", () => {
        expect(toClubWallClock(new Date("2026-08-12T12:34:56.000Z"), "Europe/Paris").toISOString())
            .toBe("2026-08-12T14:34:56.000Z");
    });

    it("utilise Europe/Paris par défaut", () => {
        const instant = new Date("2026-08-12T12:00:00.000Z");
        expect(toClubWallClock(instant).toISOString())
            .toBe(toClubWallClock(instant, CLUB_TIME_ZONE).toISOString());
    });

    it("rend un créneau dépassé strictement antérieur à la pendule du club", () => {
        // The bug case: at 15:30 Paris time (13:30Z), a slot stored at 15:00Z
        // (wall-clock 15:00) must be considered past.
        const slotStart = new Date("2026-08-12T15:00:00.000Z");
        const slotNow = toClubWallClock(new Date("2026-08-12T13:30:00.000Z"), "Europe/Paris");

        expect(slotStart.getTime()).toBeLessThan(slotNow.getTime());
        // …whereas the naive comparison with the real instant thought it upcoming.
        expect(slotStart.getTime()).toBeGreaterThan(new Date("2026-08-12T13:30:00.000Z").getTime());
    });
});
