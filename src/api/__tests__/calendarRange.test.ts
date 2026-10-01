import { describe, it, expect } from "vitest";
import { flight_sessions } from "@prisma/client";
import { getSessionsOfWeek } from "../date";

/**
 * getSessionsOfWeek only reads `id` and `sessionDateStart`, so minimal objects
 * are enough instead of full flight_sessions.
 */
const makeSession = (id: string, start: Date) =>
    ({ id, sessionDateStart: start } as flight_sessions);

// Wednesday April 8 2026, built in LOCAL time like the calendar's navigation
// date. The expected week runs from Monday 6 to Sunday 12 April.
const wednesday = new Date(2026, 3, 8, 12, 0, 0);

describe("getSessionsOfWeek", () => {
    it("garde les créneaux du lundi au dimanche de la semaine affichée", () => {
        const monday = makeSession("mon", new Date(Date.UTC(2026, 3, 6, 10, 0)));
        const sunday = makeSession("sun", new Date(Date.UTC(2026, 3, 12, 18, 0)));

        const result = getSessionsOfWeek(wednesday, [monday, sunday]);
        expect(result.map((s) => s.id)).toEqual(["mon", "sun"]);
    });

    it("écarte les créneaux des semaines encadrantes", () => {
        const before = makeSession("before", new Date(Date.UTC(2026, 3, 5, 10, 0)));
        const after = makeSession("after", new Date(Date.UTC(2026, 3, 13, 10, 0)));

        expect(getSessionsOfWeek(wednesday, [before, after])).toEqual([]);
    });

    it("compare les créneaux sur leurs composantes UTC (wall-clock)", () => {
        // Stored at 23:00 UTC on Sunday: stays in the week whatever the browser time
        // zone (a local read would push it to the next Monday east of Greenwich).
        const lateSunday = makeSession("late", new Date(Date.UTC(2026, 3, 12, 23, 0)));

        expect(getSessionsOfWeek(wednesday, [lateSunday]).map((s) => s.id)).toEqual(["late"]);
    });

    it("renvoie une liste vide quand aucun créneau ne tombe dans la semaine", () => {
        expect(getSessionsOfWeek(wednesday, [])).toEqual([]);
    });
});
