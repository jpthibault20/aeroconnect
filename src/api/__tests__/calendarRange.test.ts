import { describe, it, expect } from "vitest";
import { flight_sessions } from "@prisma/client";
import { getSessionsOfWeek } from "../date";

/**
 * getSessionsOfWeek ne lit que `id` et `sessionDateStart` : on construit des
 * objets minimalistes plutôt qu'un flight_sessions complet (même approche que
 * les autres tests de règles pures, cf. CLAUDE.md).
 */
const makeSession = (id: string, start: Date) =>
    ({ id, sessionDateStart: start } as flight_sessions);

// Mercredi 8 avril 2026, construit en LOCAL comme la date de navigation du
// calendrier. La semaine attendue va du lundi 6 au dimanche 12 avril.
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
        // Stocké à 23:00 UTC le dimanche : reste dans la semaine, quel que soit
        // le fuseau du navigateur (une lecture locale le basculerait au lundi
        // suivant à l'est de Greenwich).
        const lateSunday = makeSession("late", new Date(Date.UTC(2026, 3, 12, 23, 0)));

        expect(getSessionsOfWeek(wednesday, [lateSunday]).map((s) => s.id)).toEqual(["late"]);
    });

    it("renvoie une liste vide quand aucun créneau ne tombe dans la semaine", () => {
        expect(getSessionsOfWeek(wednesday, [])).toEqual([]);
    });
});
