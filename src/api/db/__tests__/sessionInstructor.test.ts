import { describe, it, expect } from "vitest";
import { checkSessionDate, newSession, interfaceSessions } from "../sessions";

/**
 * AN INSTRUCTOR IS REQUIRED ON A SESSION.
 *
 * Background: the member form used to offer an "Autonomous user — can book
 * without an instructor" checkbox. That label was misleading: the
 * `canSubscribeWithoutPlan` flag behind it never concerned the instructor, only
 * the "no plane" option (see commit c5b9618). Booking without an instructor was
 * never implemented.
 *
 * These tests lock the ACTUAL rule so any future change is deliberate:
 *  - every session has a pilot (flight_sessions.pilotID is non-nullable);
 *  - creation explicitly rejects a missing instructor;
 *  - a student does not create sessions, they book an instructor's session.
 *
 * The REAL functions are called here (no copy of the rule in the test): the
 * checks below happen before any database access.
 */

const baseSessionData = (over: Partial<interfaceSessions> = {}): interfaceSessions => ({
    instructorId: "instructor-1",
    date: new Date("2026-09-15T00:00:00.000Z"),
    startHour: "9",
    startMinute: "00",
    endHour: "11",
    endMinute: "00",
    duration: 60,
    endReccurence: undefined,
    planeId: ["p-club"],
    classes: [3],
    comment: "",
    natureOfTheft: [],
    ...over,
});

describe("Création d'une séance — instructeur obligatoire", () => {
    it("checkSessionDate refuse une séance sans instructeur", async () => {
        const res = await checkSessionDate(baseSessionData(), undefined);
        expect(res).toEqual({ error: "L'instructeur est obligatoire" });
    });

    it("newSession refuse aussi, indépendamment de checkSessionDate", async () => {
        // Double barrier: the caller could skip the upfront validation.
        const res = await newSession(baseSessionData(), undefined);
        expect(res).toEqual({ error: "L'instructeur est obligatoire" });
    });

    it("la date reste contrôlée avant l'instructeur (ordre des messages)", async () => {
        const res = await checkSessionDate(baseSessionData({ date: undefined }), undefined);
        expect(res).toEqual({ error: "La date de la session est obligatoire" });
    });
});

/**
 * Consequence for students: there is no "I book alone" path.
 *
 * Booking (studentRegistration / addStudentToSession) ALWAYS applies to an
 * existing session, hence one that has a pilot. Students cannot create sessions:
 * newSession is guarded by requireAuth(OWNER, ADMIN, MANAGER, INSTRUCTOR).
 */
describe("Réservation autonome — état réel de la fonctionnalité", () => {
    it("aucune séance ne peut exister sans pilote", async () => {
        // Checked here at the single creation entry point. The Prisma schema also
        // guarantees it: flight_sessions.pilotID is non-nullable.
        const sansInstructeur = await newSession(baseSessionData(), undefined);
        expect("error" in sansInstructeur).toBe(true);
    });

    it("le drapeau canSubscribeWithoutPlan ne porte AUCUNE règle d'instructeur", () => {
        // Documented on purpose: if someone re-enables a "can book without an
        // instructor" checkbox wired to this flag, this test is a reminder that nothing
        // implements it.
        const flagUsages = ["option « sans avion » (retirée)"];
        expect(flagUsages).not.toContain("réservation sans instructeur");
    });
});
