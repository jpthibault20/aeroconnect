import { describe, it, expect } from "vitest";
import { userRole } from "@prisma/client";

/**
 * Tests de protection des séances passées.
 * Logique extraite de sessions.ts, DeleteFlightSession.tsx, RemoveStudent.tsx.
 */

// --- Logique : une session est-elle passée ? ---

function isSessionPast(sessionDateStart: Date, now: Date = new Date()): boolean {
    return sessionDateStart < now;
}

// --- Logique : peut-on se désinscrire ? ---

interface UnsubscribeContext {
    sessionDate: Date;
    now: Date;
    userRole: userRole;
    clubCanUnsubscribe: boolean;
    timeDelayUnsubscribeMinutes: number;
}

const ALLOWED_UNSUBSCRIBE_ROLES = [userRole.ADMIN, userRole.INSTRUCTOR, userRole.OWNER, userRole.MANAGER];

function canUnsubscribe(ctx: UnsubscribeContext): { allowed: boolean; reason?: string } {
    const isAuthorized = ALLOWED_UNSUBSCRIBE_ROLES.includes(ctx.userRole);

    if (isSessionPast(ctx.sessionDate, ctx.now)) {
        return { allowed: false, reason: "Session passée" };
    }

    if (!isAuthorized && !ctx.clubCanUnsubscribe) {
        return { allowed: false, reason: "Désinscription désactivée par le club" };
    }

    if (!isAuthorized) {
        const deadlineMs = ctx.timeDelayUnsubscribeMinutes * 60 * 1000;
        const timeBeforeSession = ctx.sessionDate.getTime() - ctx.now.getTime();
        if (timeBeforeSession < deadlineMs) {
            return { allowed: false, reason: "Trop tard pour se désinscrire" };
        }
    }

    return { allowed: true };
}

// --- Logique : peut-on s'inscrire ? ---

interface SubscribeContext {
    sessionDate: Date;
    now: Date;
    userRestricted: boolean;
    clubCanSubscribe: boolean;
    timeDelaySubscribeMinutes: number;
    planeOperational: boolean;
    isSpecialPlane: boolean; // classroomSession ou noPlane
}

function canSubscribe(ctx: SubscribeContext): { allowed: boolean; reason?: string } {
    if (!ctx.clubCanSubscribe) {
        return { allowed: false, reason: "Inscription désactivée par le club" };
    }

    if (!ctx.isSpecialPlane && !ctx.planeOperational) {
        return { allowed: false, reason: "Avion non opérationnel" };
    }

    if (isSessionPast(ctx.sessionDate, ctx.now)) {
        return { allowed: false, reason: "Session passée" };
    }

    const deadlineMs = ctx.timeDelaySubscribeMinutes * 60 * 1000;
    const timeBeforeSession = ctx.sessionDate.getTime() - ctx.now.getTime();
    if (timeBeforeSession < deadlineMs) {
        return { allowed: false, reason: "Trop tard pour s'inscrire" };
    }

    if (ctx.userRestricted) {
        return { allowed: false, reason: "Utilisateur restreint" };
    }

    return { allowed: true };
}

// --- Tests ---

describe("Protection des séances passées", () => {
    describe("Détection session passée", () => {
        it("session hier = passée", () => {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            expect(isSessionPast(yesterday)).toBe(true);
        });

        it("session demain = pas passée", () => {
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
            expect(isSessionPast(tomorrow)).toBe(false);
        });

        it("session il y a 1 minute = passée", () => {
            const oneMinAgo = new Date(Date.now() - 60 * 1000);
            expect(isSessionPast(oneMinAgo)).toBe(true);
        });
    });

    describe("Désinscription (removeStudentFromSession)", () => {
        const now = new Date("2026-06-15T10:00:00Z");

        it("refuse la désinscription d'une session passée", () => {
            const result = canUnsubscribe({
                sessionDate: new Date("2026-06-14T10:00:00Z"),
                now,
                userRole: userRole.STUDENT,
                clubCanUnsubscribe: true,
                timeDelayUnsubscribeMinutes: 0,
            });
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe("Session passée");
        });

        it("refuse si le club interdit la désinscription (pour un STUDENT)", () => {
            const result = canUnsubscribe({
                sessionDate: new Date("2026-06-16T10:00:00Z"),
                now,
                userRole: userRole.STUDENT,
                clubCanUnsubscribe: false,
                timeDelayUnsubscribeMinutes: 0,
            });
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe("Désinscription désactivée par le club");
        });

        it("un INSTRUCTOR peut se désinscrire même si le club l'interdit", () => {
            const result = canUnsubscribe({
                sessionDate: new Date("2026-06-16T10:00:00Z"),
                now,
                userRole: userRole.INSTRUCTOR,
                clubCanUnsubscribe: false,
                timeDelayUnsubscribeMinutes: 0,
            });
            expect(result.allowed).toBe(true);
        });

        it("un ADMIN peut se désinscrire même si le club l'interdit", () => {
            const result = canUnsubscribe({
                sessionDate: new Date("2026-06-16T10:00:00Z"),
                now,
                userRole: userRole.ADMIN,
                clubCanUnsubscribe: false,
                timeDelayUnsubscribeMinutes: 0,
            });
            expect(result.allowed).toBe(true);
        });

        it("refuse si trop proche du délai (STUDENT, 60 min de délai, session dans 30 min)", () => {
            const result = canUnsubscribe({
                sessionDate: new Date("2026-06-15T10:30:00Z"),
                now,
                userRole: userRole.STUDENT,
                clubCanUnsubscribe: true,
                timeDelayUnsubscribeMinutes: 60,
            });
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe("Trop tard pour se désinscrire");
        });

        it("autorise si au-delà du délai (STUDENT, 60 min de délai, session dans 2h)", () => {
            const result = canUnsubscribe({
                sessionDate: new Date("2026-06-15T12:00:00Z"),
                now,
                userRole: userRole.STUDENT,
                clubCanUnsubscribe: true,
                timeDelayUnsubscribeMinutes: 60,
            });
            expect(result.allowed).toBe(true);
        });

        it("un MANAGER ignore le délai de désinscription", () => {
            const result = canUnsubscribe({
                sessionDate: new Date("2026-06-15T10:05:00Z"),
                now,
                userRole: userRole.MANAGER,
                clubCanUnsubscribe: true,
                timeDelayUnsubscribeMinutes: 120,
            });
            expect(result.allowed).toBe(true);
        });
    });

    describe("Inscription (studentRegistration)", () => {
        const now = new Date("2026-06-15T10:00:00Z");

        it("refuse si le club interdit l'inscription", () => {
            const result = canSubscribe({
                sessionDate: new Date("2026-06-16T10:00:00Z"),
                now,
                userRestricted: false,
                clubCanSubscribe: false,
                timeDelaySubscribeMinutes: 0,
                planeOperational: true,
                isSpecialPlane: false,
            });
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe("Inscription désactivée par le club");
        });

        it("refuse si l'avion n'est pas opérationnel", () => {
            const result = canSubscribe({
                sessionDate: new Date("2026-06-16T10:00:00Z"),
                now,
                userRestricted: false,
                clubCanSubscribe: true,
                timeDelaySubscribeMinutes: 0,
                planeOperational: false,
                isSpecialPlane: false,
            });
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe("Avion non opérationnel");
        });

        it("autorise si avion non opérationnel MAIS c'est un noPlane", () => {
            const result = canSubscribe({
                sessionDate: new Date("2026-06-16T10:00:00Z"),
                now,
                userRestricted: false,
                clubCanSubscribe: true,
                timeDelaySubscribeMinutes: 0,
                planeOperational: false,
                isSpecialPlane: true,
            });
            expect(result.allowed).toBe(true);
        });

        it("refuse si session passée", () => {
            const result = canSubscribe({
                sessionDate: new Date("2026-06-14T10:00:00Z"),
                now,
                userRestricted: false,
                clubCanSubscribe: true,
                timeDelaySubscribeMinutes: 0,
                planeOperational: true,
                isSpecialPlane: false,
            });
            expect(result.allowed).toBe(false);
        });

        it("refuse si trop proche du délai d'inscription", () => {
            const result = canSubscribe({
                sessionDate: new Date("2026-06-15T10:20:00Z"),
                now,
                userRestricted: false,
                clubCanSubscribe: true,
                timeDelaySubscribeMinutes: 30,
                planeOperational: true,
                isSpecialPlane: false,
            });
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe("Trop tard pour s'inscrire");
        });

        it("refuse si utilisateur restreint", () => {
            const result = canSubscribe({
                sessionDate: new Date("2026-06-16T10:00:00Z"),
                now,
                userRestricted: true,
                clubCanSubscribe: true,
                timeDelaySubscribeMinutes: 0,
                planeOperational: true,
                isSpecialPlane: false,
            });
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe("Utilisateur restreint");
        });

        it("autorise si toutes les conditions sont remplies", () => {
            const result = canSubscribe({
                sessionDate: new Date("2026-06-16T10:00:00Z"),
                now,
                userRestricted: false,
                clubCanSubscribe: true,
                timeDelaySubscribeMinutes: 0,
                planeOperational: true,
                isSpecialPlane: false,
            });
            expect(result.allowed).toBe(true);
        });
    });

    describe("Suppression de session", () => {
        it("la suppression d'une session passée est bloquée côté client", () => {
            const sessionDate = new Date("2026-01-01T10:00:00Z");
            const now = new Date("2026-06-15T10:00:00Z");
            expect(isSessionPast(sessionDate, now)).toBe(true);
        });
    });

    describe("Modification d'un vol signé", () => {
        const MANAGEMENT_LOGBOOK = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER, userRole.INSTRUCTOR];

        function canModifySigned(pilotSigned: boolean, role: userRole): boolean {
            if (!pilotSigned) return true;
            return MANAGEMENT_LOGBOOK.includes(role);
        }

        it("vol non signé = tout le monde peut modifier", () => {
            expect(canModifySigned(false, userRole.STUDENT)).toBe(true);
        });

        it("vol signé + STUDENT = impossible", () => {
            expect(canModifySigned(true, userRole.STUDENT)).toBe(false);
        });

        it("vol signé + PILOT = impossible", () => {
            expect(canModifySigned(true, userRole.PILOT)).toBe(false);
        });

        it("vol signé + ADMIN = autorisé", () => {
            expect(canModifySigned(true, userRole.ADMIN)).toBe(true);
        });

        it("vol signé + INSTRUCTOR = autorisé", () => {
            expect(canModifySigned(true, userRole.INSTRUCTOR)).toBe(true);
        });
    });
});
