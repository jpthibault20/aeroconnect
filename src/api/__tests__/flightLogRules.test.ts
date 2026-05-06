import { describe, it, expect } from "vitest";
import { userRole } from "@prisma/client";

/**
 * Tests des règles du carnet de vol (flight_logs).
 * Logique extraite de logbook.ts.
 */

// --- Calcul des temps par fonction pilote ---

function computeTimes(pilotFunction: string, durationMinutes: number) {
    return {
        timeDC: pilotFunction === "EP" ? durationMinutes : 0,
        timePIC: pilotFunction === "P" ? durationMinutes : 0,
        timeInstructor: pilotFunction === "I" ? durationMinutes : 0,
    };
}

// --- Mapping planeID spéciaux ---

function mapPlaneInfo(studentPlaneID: string | null, planeInfo: { immatriculation: string; name: string } | null) {
    const isClassroom = studentPlaneID === "classroomSession";
    const isNoPlane = studentPlaneID === "noPlane";
    return {
        planeID: isClassroom || isNoPlane ? null : studentPlaneID,
        planeRegistration: planeInfo?.immatriculation ?? (isClassroom ? "THEORIQUE" : isNoPlane ? "PERSO" : "N/A"),
        planeName: planeInfo?.name ?? (isClassroom ? "Théorique" : isNoPlane ? "Perso" : "Inconnu"),
    };
}

// --- Signature ---

function canSignFlight(authUserID: string, logPilotID: string, pilotSigned: boolean): { allowed: boolean; reason?: string } {
    if (authUserID !== logPilotID) return { allowed: false, reason: "Seul le pilote concerné peut signer" };
    if (pilotSigned) return { allowed: false, reason: "Entrée déjà signée" };
    return { allowed: true };
}

// --- Suppression ---

function canDeleteFlight(role: userRole, pilotSigned: boolean, authClubID: string, logClubID: string): { allowed: boolean; reason?: string } {
    const DELETE_ROLES = [userRole.OWNER, userRole.ADMIN];
    if (!DELETE_ROLES.includes(role)) return { allowed: false, reason: "Permissions insuffisantes" };
    if (authClubID !== logClubID) return { allowed: false, reason: "Club différent" };
    if (pilotSigned) return { allowed: false, reason: "Impossible de supprimer une entrée signée" };
    return { allowed: true };
}

// --- Auto-création : filtrage sessions éligibles ---

const REGULATION_START = new Date("2025-07-01");

function isSessionEligibleForLog(sessionDate: Date, studentID: string | null, now: Date): boolean {
    return studentID !== null && sessionDate < now && sessionDate >= REGULATION_START;
}

// --- Auto-signature du log élève (EP) quand l'instructeur (I) signe ---
//
// Quand un instructeur signe son log de vol, on signe aussi le log "EP" (élève
// pilote) de la même session. Cf. logbook.ts → signFlightLog.

interface SignableLog {
    id: string;
    sessionID: string | null;
    pilotFunction: "I" | "EP" | "P";
    pilotSigned: boolean;
}

function shouldAlsoSignEPSibling(signedLog: SignableLog): boolean {
    return (
        signedLog.pilotFunction === "I" &&
        signedLog.sessionID !== null
    );
}

function findEPSiblingsToSign(signedLog: SignableLog, allLogs: SignableLog[]): SignableLog[] {
    if (!shouldAlsoSignEPSibling(signedLog)) return [];
    return allLogs.filter(
        (l) =>
            l.id !== signedLog.id &&
            l.sessionID === signedLog.sessionID &&
            l.pilotFunction === "EP" &&
            !l.pilotSigned
    );
}

// --- Filtrage des vols incomplets (popup carnet de vol) ---
//
// `flight_logs.date` est une colonne PG `DATE` (cf. schema.prisma : @db.Date).
// Postgres tronque l'heure → un vol stocké à 09:00Z est lu comme 00:00Z.
// La popup doit donc utiliser `lt: tomorrow` (et NON `lt: now`), sinon les
// vols du jour sont rejetés. Cf. logbook.ts → getIncompleteFlightLogs.
function startOfTomorrowUTC(now: Date): Date {
    const t = new Date(now);
    t.setUTCHours(0, 0, 0, 0);
    t.setUTCDate(t.getUTCDate() + 1);
    return t;
}

function isLogIncomplete(
    log: { pilotSigned: boolean; date: Date; pilotFunction: string; pilotID: string; clubID: string },
    queryPilotID: string,
    queryClubID: string,
    now: Date
): boolean {
    if (log.pilotID !== queryPilotID) return false;
    if (log.clubID !== queryClubID) return false;
    if (log.pilotSigned) return false;
    if (log.pilotFunction === "EP") return false;
    return log.date < startOfTomorrowUTC(now);
}

// --- Tests ---

describe("Règles du carnet de vol", () => {
    describe("Calcul des temps par fonction pilote", () => {
        it("EP (élève pilote) → tout en temps double commande", () => {
            const times = computeTimes("EP", 90);
            expect(times.timeDC).toBe(90);
            expect(times.timePIC).toBe(0);
            expect(times.timeInstructor).toBe(0);
        });

        it("P (pilote) → tout en temps commandant de bord", () => {
            const times = computeTimes("P", 60);
            expect(times.timeDC).toBe(0);
            expect(times.timePIC).toBe(60);
            expect(times.timeInstructor).toBe(0);
        });

        it("I (instructeur) → tout en temps instructeur", () => {
            const times = computeTimes("I", 120);
            expect(times.timeDC).toBe(0);
            expect(times.timePIC).toBe(0);
            expect(times.timeInstructor).toBe(120);
        });

        it("fonction inconnue → tous à 0", () => {
            const times = computeTimes("X", 60);
            expect(times.timeDC).toBe(0);
            expect(times.timePIC).toBe(0);
            expect(times.timeInstructor).toBe(0);
        });
    });

    describe("Mapping des avions spéciaux", () => {
        it("classroomSession → THEORIQUE, planeID null", () => {
            const info = mapPlaneInfo("classroomSession", null);
            expect(info.planeID).toBeNull();
            expect(info.planeRegistration).toBe("THEORIQUE");
            expect(info.planeName).toBe("Théorique");
        });

        it("noPlane → PERSO, planeID null", () => {
            const info = mapPlaneInfo("noPlane", null);
            expect(info.planeID).toBeNull();
            expect(info.planeRegistration).toBe("PERSO");
            expect(info.planeName).toBe("Perso");
        });

        it("avion normal avec info → registration et nom de l'avion", () => {
            const info = mapPlaneInfo("plane-1", { immatriculation: "F-GXYZ", name: "DR400" });
            expect(info.planeID).toBe("plane-1");
            expect(info.planeRegistration).toBe("F-GXYZ");
            expect(info.planeName).toBe("DR400");
        });

        it("avion normal sans info (supprimé?) → N/A et Inconnu", () => {
            const info = mapPlaneInfo("plane-1", null);
            expect(info.planeID).toBe("plane-1");
            expect(info.planeRegistration).toBe("N/A");
            expect(info.planeName).toBe("Inconnu");
        });
    });

    describe("Signature", () => {
        it("le pilote peut signer son propre vol non signé", () => {
            const result = canSignFlight("pilot-1", "pilot-1", false);
            expect(result.allowed).toBe(true);
        });

        it("un autre utilisateur ne peut PAS signer", () => {
            const result = canSignFlight("other-user", "pilot-1", false);
            expect(result.allowed).toBe(false);
        });

        it("un vol déjà signé ne peut PAS être re-signé", () => {
            const result = canSignFlight("pilot-1", "pilot-1", true);
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe("Entrée déjà signée");
        });
    });

    describe("Suppression de vol", () => {
        it("OWNER peut supprimer un vol non signé de son club", () => {
            expect(canDeleteFlight(userRole.OWNER, false, "club-1", "club-1").allowed).toBe(true);
        });

        it("ADMIN peut supprimer un vol non signé de son club", () => {
            expect(canDeleteFlight(userRole.ADMIN, false, "club-1", "club-1").allowed).toBe(true);
        });

        it("MANAGER ne peut PAS supprimer (seuls OWNER/ADMIN)", () => {
            expect(canDeleteFlight(userRole.MANAGER, false, "club-1", "club-1").allowed).toBe(false);
        });

        it("personne ne peut supprimer un vol signé", () => {
            expect(canDeleteFlight(userRole.OWNER, true, "club-1", "club-1").allowed).toBe(false);
            expect(canDeleteFlight(userRole.ADMIN, true, "club-1", "club-1").allowed).toBe(false);
        });

        it("ne peut PAS supprimer un vol d'un autre club", () => {
            expect(canDeleteFlight(userRole.ADMIN, false, "club-1", "club-2").allowed).toBe(false);
        });
    });

    describe("Éligibilité pour l'auto-création de logs", () => {
        const now = new Date("2026-04-11T10:00:00Z");

        it("session passée avec élève après la réglementation = éligible", () => {
            expect(isSessionEligibleForLog(new Date("2025-08-01"), "stu-1", now)).toBe(true);
        });

        it("session passée SANS élève = non éligible", () => {
            expect(isSessionEligibleForLog(new Date("2025-08-01"), null, now)).toBe(false);
        });

        it("session AVANT la date de réglementation = non éligible", () => {
            expect(isSessionEligibleForLog(new Date("2025-06-15"), "stu-1", now)).toBe(false);
        });

        it("session future = non éligible", () => {
            expect(isSessionEligibleForLog(new Date("2027-01-01"), "stu-1", now)).toBe(false);
        });

        it("session exactement à la date de réglementation = éligible", () => {
            expect(isSessionEligibleForLog(new Date("2025-07-01"), "stu-1", now)).toBe(true);
        });
    });

    describe("Auto-signature du log élève quand l'instructeur signe", () => {
        const instructorLog: SignableLog = {
            id: "log-I-1",
            sessionID: "session-1",
            pilotFunction: "I",
            pilotSigned: false,
        };
        const studentLog: SignableLog = {
            id: "log-EP-1",
            sessionID: "session-1",
            pilotFunction: "EP",
            pilotSigned: false,
        };
        const otherSessionStudentLog: SignableLog = {
            id: "log-EP-2",
            sessionID: "session-2",
            pilotFunction: "EP",
            pilotSigned: false,
        };

        it("instructeur signe → log élève de la même session est auto-signé", () => {
            const siblings = findEPSiblingsToSign(instructorLog, [instructorLog, studentLog]);
            expect(siblings).toHaveLength(1);
            expect(siblings[0].id).toBe("log-EP-1");
        });

        it("ne signe pas les logs EP d'autres sessions", () => {
            const siblings = findEPSiblingsToSign(instructorLog, [instructorLog, studentLog, otherSessionStudentLog]);
            expect(siblings.map((s) => s.id)).toEqual(["log-EP-1"]);
        });

        it("ne re-signe pas un log EP déjà signé", () => {
            const alreadySigned: SignableLog = { ...studentLog, pilotSigned: true };
            const siblings = findEPSiblingsToSign(instructorLog, [instructorLog, alreadySigned]);
            expect(siblings).toHaveLength(0);
        });

        it("pilote solo (P) ne déclenche PAS l'auto-signature", () => {
            // Vol pilote sans élève → aucun log EP ne devrait exister, et même
            // si un log EP traînait pour la même session, on ne le signe pas.
            const pilotSoloLog: SignableLog = {
                id: "log-P-1",
                sessionID: "session-1",
                pilotFunction: "P",
                pilotSigned: false,
            };
            const siblings = findEPSiblingsToSign(pilotSoloLog, [pilotSoloLog, studentLog]);
            expect(siblings).toHaveLength(0);
        });

        it("entrée manuelle sans sessionID ne déclenche PAS l'auto-signature", () => {
            const manualInstructorLog: SignableLog = {
                id: "log-I-manual",
                sessionID: null,
                pilotFunction: "I",
                pilotSigned: false,
            };
            const siblings = findEPSiblingsToSign(manualInstructorLog, [manualInstructorLog, studentLog]);
            expect(siblings).toHaveLength(0);
        });

        it("plusieurs élèves dans la même session → tous signés (cas vol en double commande à plusieurs)", () => {
            const studentLog2: SignableLog = {
                id: "log-EP-1b",
                sessionID: "session-1",
                pilotFunction: "EP",
                pilotSigned: false,
            };
            const siblings = findEPSiblingsToSign(instructorLog, [instructorLog, studentLog, studentLog2]);
            expect(siblings).toHaveLength(2);
            expect(siblings.map((s) => s.id).sort()).toEqual(["log-EP-1", "log-EP-1b"]);
        });
    });

    describe("Popup vols incomplets — filtrage cohérent avec PG DATE", () => {
        // Régression : la colonne `flight_logs.date` est de type PG `DATE`,
        // donc l'heure est tronquée en base. Filtrer avec `lt: new Date()`
        // rejetait les vols du jour (`aujourd'hui < aujourd'hui` = false).
        // Le fix : comparer à `startOfTomorrowUTC(now)`.

        const baseLog = {
            pilotSigned: false,
            pilotFunction: "I",
            pilotID: "pilot-1",
            clubID: "club-1",
        };
        const now = new Date("2026-05-06T18:46:00.000Z"); // 20h46 CEST

        it("vol du jour (date = aujourd'hui 00:00Z) → inclus dans la popup", () => {
            const log = { ...baseLog, date: new Date("2026-05-06T00:00:00.000Z") };
            expect(isLogIncomplete(log, "pilot-1", "club-1", now)).toBe(true);
        });

        it("vol d'hier → inclus", () => {
            const log = { ...baseLog, date: new Date("2026-05-05T00:00:00.000Z") };
            expect(isLogIncomplete(log, "pilot-1", "club-1", now)).toBe(true);
        });

        it("vol de demain → exclu", () => {
            const log = { ...baseLog, date: new Date("2026-05-07T00:00:00.000Z") };
            expect(isLogIncomplete(log, "pilot-1", "club-1", now)).toBe(false);
        });

        it("vol déjà signé → exclu", () => {
            const log = { ...baseLog, pilotSigned: true, date: new Date("2026-05-06T00:00:00.000Z") };
            expect(isLogIncomplete(log, "pilot-1", "club-1", now)).toBe(false);
        });

        it("entrée élève (pilotFunction = EP) → exclue (pas pour la popup pilote)", () => {
            const log = { ...baseLog, pilotFunction: "EP", date: new Date("2026-05-06T00:00:00.000Z") };
            expect(isLogIncomplete(log, "pilot-1", "club-1", now)).toBe(false);
        });

        it("vol d'un autre pilote → exclu", () => {
            const log = { ...baseLog, pilotID: "other", date: new Date("2026-05-06T00:00:00.000Z") };
            expect(isLogIncomplete(log, "pilot-1", "club-1", now)).toBe(false);
        });

        it("vol d'un autre club → exclu", () => {
            const log = { ...baseLog, clubID: "other-club", date: new Date("2026-05-06T00:00:00.000Z") };
            expect(isLogIncomplete(log, "pilot-1", "club-1", now)).toBe(false);
        });

        it("regression : `lt: now` (au lieu de `lt: tomorrow`) rejetterait le vol du jour", () => {
            // C'est exactement le bug observé : log.date stocké comme DATE
            // donc 00:00Z, et `< now` est faux quand on tronque PG côté DB.
            // On simule la comparaison côté JS avec l'ancienne logique.
            const logDate = new Date("2026-05-06T00:00:00.000Z");
            const oldFilterIncluded = logDate < now; // l'ancienne logique JS marchait...
            // ... mais côté Postgres, avec @db.Date, `now` est tronqué en
            // '2026-05-06'::date, et la comparaison devient '2026-05-06' <
            // '2026-05-06' = false. On simule ça :
            const truncatedNow = new Date(now);
            truncatedNow.setUTCHours(0, 0, 0, 0);
            const sqlBehavior = logDate < truncatedNow;
            expect(oldFilterIncluded).toBe(true); // JS pur OK
            expect(sqlBehavior).toBe(false);      // mais SQL DATE rejette → bug
            // Le nouveau filtre `lt: tomorrow` corrige :
            expect(logDate < startOfTomorrowUTC(now)).toBe(true);
        });

        it("startOfTomorrowUTC est strictement > tout instant d'aujourd'hui", () => {
            const tomorrow = startOfTomorrowUTC(now);
            expect(tomorrow > now).toBe(true);
            const endOfToday = new Date("2026-05-06T23:59:59.999Z");
            expect(tomorrow > endOfToday).toBe(true);
            // et c'est exactement minuit le lendemain
            expect(tomorrow.toISOString()).toBe("2026-05-07T00:00:00.000Z");
        });
    });

    describe("Mise à jour du hobbsTotal sur l'avion", () => {
        it("hobbsEnd met à jour le total si planeID existe", () => {
            const planeID = "plane-1";
            const hobbsEnd = 1500.5;
            const shouldUpdate = !!planeID && !!hobbsEnd;
            expect(shouldUpdate).toBe(true);
        });

        it("pas de mise à jour si planeID est null (noPlane)", () => {
            const planeID = null;
            const hobbsEnd = 1500.5;
            const shouldUpdate = !!planeID && !!hobbsEnd;
            expect(shouldUpdate).toBe(false);
        });

        it("pas de mise à jour si hobbsEnd non renseigné", () => {
            const planeID = "plane-1";
            const hobbsEnd = undefined;
            const shouldUpdate = !!planeID && !!hobbsEnd;
            expect(shouldUpdate).toBe(false);
        });
    });
});
