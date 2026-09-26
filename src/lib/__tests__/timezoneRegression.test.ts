import { describe, it, expect } from "vitest";
import { userRole } from "@prisma/client";
import { clubPeriodStart, toClubWallClock } from "@/lib/clubTime";
import { checkStudentRegistration, checkStudentRemoval, RegistrationContext } from "@/lib/sessionRules";

/**
 * Non-régression heure locale / UTC (AER-66, AER-67).
 *
 * Rappel : les créneaux sont stockés en « wall-clock UTC » (15:00 à Paris est
 * écrit T15:00Z). Avant AER-67, l'heure courante était ramenée dans ce
 * référentiel avec le décalage envoyé par le navigateur
 * (`now - getTimezoneOffset()`) ; elle l'est désormais côté serveur avec
 * toClubWallClock. Ces tests garantissent que les deux donnent le même
 * résultat, été comme hiver, et que rien ne se décale d'une ou deux heures.
 * Ils passent quel que soit le fuseau de la machine qui les exécute.
 */

// Ancien calcul, fait avec l'offset du navigateur (-120 l'été, -60 l'hiver à Paris).
const legacyWallClock = (instant: Date, browserOffsetMinutes: number) =>
    new Date(instant.getTime() - browserOffsetMinutes * 60_000);

describe("heure courante du club : équivalence avec l'ancien calcul navigateur", () => {
    it("été (UTC+2)", () => {
        const instant = new Date("2026-08-12T12:00:00Z"); // 14:00 à Paris
        expect(toClubWallClock(instant).toISOString()).toBe(legacyWallClock(instant, -120).toISOString());
        expect(toClubWallClock(instant).toISOString()).toBe("2026-08-12T14:00:00.000Z");
    });

    it("hiver (UTC+1)", () => {
        const instant = new Date("2026-01-15T12:00:00Z"); // 13:00 à Paris
        expect(toClubWallClock(instant).toISOString()).toBe(legacyWallClock(instant, -60).toISOString());
    });

    it("nuit du changement d'heure (29/03/2026) : avant et après le passage", () => {
        expect(toClubWallClock(new Date("2026-03-29T00:30:00Z")).toISOString()).toBe("2026-03-29T01:30:00.000Z");
        expect(toClubWallClock(new Date("2026-03-29T01:30:00Z")).toISOString()).toBe("2026-03-29T03:30:00.000Z");
    });
});

describe("inscription : délai calculé en heure du club", () => {
    // Il est 14:00 à Paris (12:00 UTC réel).
    const now = toClubWallClock(new Date("2026-08-12T12:00:00Z"));
    const ctx = (sessionWallClock: string, delayMinutes: number): RegistrationContext => ({
        user: { id: "s1", role: userRole.STUDENT, restricted: false, clubID: "club-1", classes: [3] },
        club: { userCanSubscribe: true, timeDelaySubscribeminutes: delayMinutes },
        session: { clubID: "club-1", sessionDateStart: new Date(sessionWallClock), studentID: null, planeID: ["classroomSession"] },
        planeID: "classroomSession",
        plane: null,
        clubPlanes: [],
        now,
        hasConflict: false,
        heldByBapteme: false,
    });

    it("créneau de 15:00 avec délai d'1 h : autorisé pile à la limite", () => {
        expect(checkStudentRegistration(ctx("2026-08-12T15:00:00Z", 60)).ok).toBe(true);
    });

    it("créneau de 15:00 avec délai de 61 min : refusé", () => {
        expect(checkStudentRegistration(ctx("2026-08-12T15:00:00Z", 61)).ok).toBe(false);
    });

    it("créneau de 13:30 (déjà commencé à Paris) : refusé, pas de fenêtre de 2 h", () => {
        // Comparé naïvement à new Date() (12:00Z), il passerait pour futur.
        expect(checkStudentRegistration(ctx("2026-08-12T13:30:00Z", 0)).ok).toBe(false);
    });
});

describe("désinscription : délai calculé en heure du club", () => {
    const now = toClubWallClock(new Date("2026-01-15T12:00:00Z")); // 13:00 à Paris
    const removal = (sessionWallClock: string, delay: number) => checkStudentRemoval({
        user: { id: "s1", role: userRole.STUDENT, clubID: "club-1" },
        club: { userCanUnsubscribe: true, timeDelayUnsubscribeminutes: delay },
        session: { clubID: "club-1", studentID: "s1", sessionDateStart: new Date(sessionWallClock) },
        now,
    });

    it("créneau de 15:00 avec délai de 2 h : autorisé", () => {
        expect(removal("2026-01-15T15:00:00Z", 120).ok).toBe(true);
    });

    it("créneau de 14:30 avec délai de 2 h : refusé", () => {
        expect(removal("2026-01-15T14:30:00Z", 120).ok).toBe(false);
    });
});

describe("clubPeriodStart : début de mois / d'année en heure de Paris", () => {
    it("août (UTC+2) : le mois commence le 31/07 à 22:00 UTC", () => {
        expect(clubPeriodStart(new Date("2026-08-12T12:00:00Z"), "month").toISOString()).toBe("2026-07-31T22:00:00.000Z");
    });

    it("janvier (UTC+1) : le mois commence le 31/12 à 23:00 UTC", () => {
        expect(clubPeriodStart(new Date("2026-01-15T12:00:00Z"), "month").toISOString()).toBe("2025-12-31T23:00:00.000Z");
    });

    it("1er septembre à 00:30 heure de Paris : on est bien en septembre", () => {
        // 22:30 UTC le 31/08 : un calcul en UTC (serveur Vercel) le mettrait en août.
        expect(clubPeriodStart(new Date("2026-08-31T22:30:00Z"), "month").toISOString()).toBe("2026-08-31T22:00:00.000Z");
    });

    it("fin mars (heure d'été) : le 1er mars était encore en heure d'hiver", () => {
        expect(clubPeriodStart(new Date("2026-03-30T10:00:00Z"), "month").toISOString()).toBe("2026-02-28T23:00:00.000Z");
    });

    it("fin octobre (heure d'hiver) : le 1er octobre était encore en heure d'été", () => {
        expect(clubPeriodStart(new Date("2026-10-26T10:00:00Z"), "month").toISOString()).toBe("2026-09-30T22:00:00.000Z");
    });

    it("année : le 1er janvier à minuit heure de Paris", () => {
        expect(clubPeriodStart(new Date("2026-08-12T12:00:00Z"), "year").toISOString()).toBe("2025-12-31T23:00:00.000Z");
    });
});
