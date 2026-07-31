import { describe, it, expect } from "vitest";
import { CLUB_TIME_ZONE, toClubWallClock } from "@/lib/clubTime";

/**
 * Ces tests passent quel que soit le fuseau du runner : `toClubWallClock` reçoit
 * toujours un fuseau explicite, et les attendus sont des instants UTC absolus.
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
        // 22:00Z en août = 00:00 le 13 à Paris.
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
        // Le cas du bug : à 15:30 heure de Paris (13:30Z), un créneau stocké
        // 15:00Z (wall-clock 15:00) doit être considéré comme passé.
        const slotStart = new Date("2026-08-12T15:00:00.000Z");
        const slotNow = toClubWallClock(new Date("2026-08-12T13:30:00.000Z"), "Europe/Paris");

        expect(slotStart.getTime()).toBeLessThan(slotNow.getTime());
        // …alors que la comparaison naïve à l'instant réel le croyait futur.
        expect(slotStart.getTime()).toBeGreaterThan(new Date("2026-08-12T13:30:00.000Z").getTime());
    });
});
