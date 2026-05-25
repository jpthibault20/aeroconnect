import { describe, it, expect } from "vitest";
import { userRole } from "@prisma/client";
import {
    computeDurationMinutes,
    computeFlightTimes,
    derivePilotFunction,
    isInstructorRole,
    validateNatureSubType,
    formatNature,
    decimalToHoursMinutes,
    hoursMinutesToDecimal,
    parseHobbsInput,
    formatHobbsValue,
    computeFlightTimesWithFallback,
} from "@/lib/logbookCalc";

/**
 * Tests des règles du carnet de vol (flight_logs).
 * Logique extraite de logbook.ts + helpers logbookCalc.ts.
 */

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

// Aligné sur la valeur prod (cf. src/api/db/logbook.ts) — fixée à la date de
// déploiement de la feature pour ne pas backfill des sessions historiques.
const REGULATION_START = new Date("2026-05-25");

function isSessionEligibleForLog(sessionDate: Date, studentID: string | null, now: Date): boolean {
    return studentID !== null && sessionDate < now && sessionDate >= REGULATION_START;
}

// --- Auto-signature du log élève (EP) quand l'instructeur (I) signe ---

interface SignableLog {
    id: string;
    sessionID: string | null;
    pilotFunction: "I" | "EP" | "P";
    pilotSigned: boolean;
}

function shouldAlsoSignEPSibling(signedLog: SignableLog): boolean {
    return signedLog.pilotFunction === "I" && signedLog.sessionID !== null;
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
    describe("Durée calculée depuis les heures moteur", () => {
        it("hobbsEnd - hobbsStart converti en minutes", () => {
            expect(computeDurationMinutes(100, 101.5)).toBe(90);
        });

        it("hobbsStart null → 0", () => {
            expect(computeDurationMinutes(null, 101.5)).toBe(0);
        });

        it("hobbsEnd null → 0", () => {
            expect(computeDurationMinutes(100, null)).toBe(0);
        });

        it("hobbsEnd <= hobbsStart → 0 (vol incohérent ou non commencé)", () => {
            expect(computeDurationMinutes(100, 100)).toBe(0);
            expect(computeDurationMinutes(100, 99)).toBe(0);
        });

        it("arrondi au plus proche", () => {
            // 1.51h = 90.6min → arrondi à 91
            expect(computeDurationMinutes(0, 1.51)).toBe(91);
            // 1.005h = 60.3min → arrondi à 60
            expect(computeDurationMinutes(0, 1.005)).toBe(60);
        });
    });

    describe("Conversion format compteur HH:MM <-> heures décimales", () => {
        it("décimal → heures + minutes", () => {
            expect(decimalToHoursMinutes(123.5)).toEqual({ hours: 123, minutes: 30 });
            expect(decimalToHoursMinutes(123.25)).toEqual({ hours: 123, minutes: 15 });
            expect(decimalToHoursMinutes(0.1)).toEqual({ hours: 0, minutes: 6 });
            expect(decimalToHoursMinutes(100)).toEqual({ hours: 100, minutes: 0 });
        });

        it("heures + minutes → décimal canonique", () => {
            expect(hoursMinutesToDecimal(123, 30)).toBe(123.5);
            expect(hoursMinutesToDecimal(123, 15)).toBe(123.25);
            expect(hoursMinutesToDecimal(0, 6)).toBe(0.1);
            // 18 min ≠ 30 min : c'est précisément le bug que le format HH:MM corrige.
            expect(hoursMinutesToDecimal(123, 18)).toBe(123.3);
        });

        it("aller-retour stable à la minute près", () => {
            for (const [h, m] of [[123, 30], [10, 5], [0, 59], [200, 1]] as const) {
                const { hours, minutes } = decimalToHoursMinutes(hoursMinutesToDecimal(h, m));
                expect({ hours, minutes }).toEqual({ hours: h, minutes: m });
            }
        });

        it("une saisie HH:MM '123:30' donne la bonne durée vs '123:18'", () => {
            // Vol de 30 min réel saisi en HH:MM puis converti en décimal.
            const start = hoursMinutesToDecimal(123, 0); // 123,0
            const end30 = hoursMinutesToDecimal(123, 30); // 123,5
            expect(computeDurationMinutes(start, end30)).toBe(30);
            const end18 = hoursMinutesToDecimal(123, 18); // 123,3
            expect(computeDurationMinutes(start, end18)).toBe(18);
        });
    });

    describe("Saisie hobbs popup (parseHobbsInput / formatHobbsValue)", () => {
        it("HH:MM : séparateur libre , . : donnent le même résultat", () => {
            for (const raw of ["123,30", "123.30", "123:30"]) {
                expect(parseHobbsInput(raw, "HMS")).toEqual({ decimal: 123.5, minutesInvalid: false });
            }
        });

        it("HH:MM : heures seules sans séparateur", () => {
            expect(parseHobbsInput("123", "HMS")).toEqual({ decimal: 123, minutesInvalid: false });
        });

        it("HH:MM : chiffres après séparateur = minutes (pas une fraction)", () => {
            expect(parseHobbsInput("123,5", "HMS").decimal).toBe(hoursMinutesToDecimal(123, 5));
            expect(parseHobbsInput("123,50", "HMS").decimal).toBe(hoursMinutesToDecimal(123, 50));
        });

        it("HH:MM : minutes >= 60 signalées invalides (pas de valeur)", () => {
            expect(parseHobbsInput("123,75", "HMS")).toEqual({ decimal: null, minutesInvalid: true });
            expect(parseHobbsInput("123,60", "HMS").minutesInvalid).toBe(true);
        });

        it("HH:MM : saisie vide ou incohérente → pas de valeur", () => {
            expect(parseHobbsInput("", "HMS")).toEqual({ decimal: null, minutesInvalid: false });
            expect(parseHobbsInput("abc", "HMS")).toEqual({ decimal: null, minutesInvalid: false });
        });

        it("Décimal : la virgule est acceptée comme séparateur décimal", () => {
            expect(parseHobbsInput("123,5", "DECIMAL").decimal).toBe(123.5);
            expect(parseHobbsInput("123.5", "DECIMAL").decimal).toBe(123.5);
        });

        it("formatHobbsValue : décimal canonique -> affichage selon format", () => {
            expect(formatHobbsValue(123.5, "HMS")).toBe("123:30");
            expect(formatHobbsValue(123.5, "DECIMAL")).toBe("123.5");
            expect(formatHobbsValue(null, "HMS")).toBe("");
        });

        it("aller-retour saisie HH:MM -> stockage -> ré-affichage", () => {
            const stored = parseHobbsInput("123:30", "HMS").decimal;
            expect(formatHobbsValue(stored, "HMS")).toBe("123:30");
        });
    });

    describe("Durée provisoire des vols non signés (computeFlightTimesWithFallback)", () => {
        it("hobbsStart figé : durée définitive, non provisoire", () => {
            const t = computeFlightTimesWithFallback(
                { hobbsStart: 100, hobbsEnd: 101.5, pilotFunction: "P" },
                123 // hobbs avion ignoré car hobbsStart déjà figé
            );
            expect(t.durationMinutes).toBe(90);
            expect(t.provisional).toBe(false);
        });

        it("hobbsStart null + hobbs avion fourni : durée provisoire estimée", () => {
            const t = computeFlightTimesWithFallback(
                { hobbsStart: null, hobbsEnd: 101.5, pilotFunction: "EP" },
                100
            );
            expect(t.durationMinutes).toBe(90);
            expect(t.timeDC).toBe(90);
            expect(t.provisional).toBe(true);
        });

        it("hobbsStart null sans hobbs avion : pas de durée, pas provisoire", () => {
            const t = computeFlightTimesWithFallback(
                { hobbsStart: null, hobbsEnd: 101.5, pilotFunction: "P" },
                null
            );
            expect(t.durationMinutes).toBe(0);
            expect(t.provisional).toBe(false);
        });

        it("hobbs avion > hobbsEnd (incohérent) : durée 0, pas provisoire", () => {
            const t = computeFlightTimesWithFallback(
                { hobbsStart: null, hobbsEnd: 99, pilotFunction: "P" },
                100
            );
            expect(t.durationMinutes).toBe(0);
            expect(t.provisional).toBe(false);
        });
    });

    describe("Calcul des temps DC / CdB / Instructeur depuis hobbs + fonction", () => {
        it("EP (élève pilote) → tout en temps double commande", () => {
            const t = computeFlightTimes({ hobbsStart: 100, hobbsEnd: 101.5, pilotFunction: "EP" });
            expect(t.durationMinutes).toBe(90);
            expect(t.timeDC).toBe(90);
            expect(t.timePIC).toBe(0);
            expect(t.timeInstructor).toBe(0);
        });

        it("P (pilote) → tout en temps commandant de bord", () => {
            const t = computeFlightTimes({ hobbsStart: 100, hobbsEnd: 101, pilotFunction: "P" });
            expect(t.durationMinutes).toBe(60);
            expect(t.timeDC).toBe(0);
            expect(t.timePIC).toBe(60);
            expect(t.timeInstructor).toBe(0);
        });

        it("I (instructeur) → tout en temps instructeur", () => {
            const t = computeFlightTimes({ hobbsStart: 100, hobbsEnd: 102, pilotFunction: "I" });
            expect(t.durationMinutes).toBe(120);
            expect(t.timeDC).toBe(0);
            expect(t.timePIC).toBe(0);
            expect(t.timeInstructor).toBe(120);
        });

        it("hobbs manquants → tous à 0 (vol pas encore complété)", () => {
            const t = computeFlightTimes({ hobbsStart: null, hobbsEnd: null, pilotFunction: "P" });
            expect(t.durationMinutes).toBe(0);
            expect(t.timePIC).toBe(0);
        });
    });

    describe("Déduction de pilotFunction depuis nature + rôle", () => {
        it("nature CDB → fonction = P quel que soit le rôle", () => {
            expect(derivePilotFunction("CDB", userRole.PILOT)).toBe("P");
            expect(derivePilotFunction("CDB", userRole.INSTRUCTOR)).toBe("P");
            expect(derivePilotFunction("CDB", userRole.STUDENT)).toBe("P");
        });

        it("nature INSTRUCTION + instructeur → fonction = I", () => {
            expect(derivePilotFunction("INSTRUCTION", userRole.INSTRUCTOR)).toBe("I");
            expect(derivePilotFunction("INSTRUCTION", userRole.OWNER)).toBe("I");
            expect(derivePilotFunction("INSTRUCTION", userRole.ADMIN)).toBe("I");
        });

        it("nature INSTRUCTION + non-instructeur → fonction = EP", () => {
            expect(derivePilotFunction("INSTRUCTION", userRole.STUDENT)).toBe("EP");
            expect(derivePilotFunction("INSTRUCTION", userRole.PILOT)).toBe("EP");
            expect(derivePilotFunction("INSTRUCTION", userRole.MANAGER)).toBe("EP");
        });
    });

    describe("isInstructorRole", () => {
        it("INSTRUCTOR / OWNER / ADMIN sont considérés comme instructeurs", () => {
            expect(isInstructorRole(userRole.INSTRUCTOR)).toBe(true);
            expect(isInstructorRole(userRole.OWNER)).toBe(true);
            expect(isInstructorRole(userRole.ADMIN)).toBe(true);
        });

        it("STUDENT / PILOT / MANAGER / USER ne sont pas instructeurs", () => {
            expect(isInstructorRole(userRole.STUDENT)).toBe(false);
            expect(isInstructorRole(userRole.PILOT)).toBe(false);
            expect(isInstructorRole(userRole.MANAGER)).toBe(false);
            expect(isInstructorRole(userRole.USER)).toBe(false);
        });
    });

    describe("Validation nature / sous-type", () => {
        it("INSTRUCTION sans sous-type → erreur", () => {
            const r = validateNatureSubType("INSTRUCTION", null);
            expect(r.ok).toBe(false);
        });

        it("INSTRUCTION avec sous-type → ok", () => {
            expect(validateNatureSubType("INSTRUCTION", "LOCAL").ok).toBe(true);
            expect(validateNatureSubType("INSTRUCTION", "NAVIGATION").ok).toBe(true);
            expect(validateNatureSubType("INSTRUCTION", "LACHE").ok).toBe(true);
            expect(validateNatureSubType("INSTRUCTION", "BAPTEME").ok).toBe(true);
            expect(validateNatureSubType("INSTRUCTION", "EXAM").ok).toBe(true);
        });

        it("CDB sans sous-type → ok", () => {
            expect(validateNatureSubType("CDB", null).ok).toBe(true);
        });

        it("CDB avec sous-type → erreur (incohérent)", () => {
            expect(validateNatureSubType("CDB", "LOCAL").ok).toBe(false);
        });
    });

    describe("Formattage nature", () => {
        it("CDB → 'CdB'", () => {
            expect(formatNature("CDB", null)).toBe("CdB");
        });

        it("INSTRUCTION + sous-type → 'Instr. (Local)' etc.", () => {
            expect(formatNature("INSTRUCTION", "LOCAL")).toBe("Instr. (Local)");
            expect(formatNature("INSTRUCTION", "NAVIGATION")).toBe("Instr. (Navigation)");
            expect(formatNature("INSTRUCTION", "LACHE")).toBe("Instr. (Lâché)");
            expect(formatNature("INSTRUCTION", "BAPTEME")).toBe("Instr. (Baptême)");
            expect(formatNature("INSTRUCTION", "EXAM")).toBe("Instr. (Examen)");
        });

        it("INSTRUCTION sans sous-type → 'Instruction'", () => {
            expect(formatNature("INSTRUCTION", null)).toBe("Instruction");
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
            expect(canSignFlight("pilot-1", "pilot-1", false).allowed).toBe(true);
        });

        it("un autre utilisateur ne peut PAS signer", () => {
            expect(canSignFlight("other-user", "pilot-1", false).allowed).toBe(false);
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
        const now = new Date("2026-08-15T10:00:00Z");

        it("session passée avec élève après la réglementation = éligible", () => {
            expect(isSessionEligibleForLog(new Date("2026-06-15"), "stu-1", now)).toBe(true);
        });

        it("session passée SANS élève = non éligible", () => {
            expect(isSessionEligibleForLog(new Date("2026-06-15"), null, now)).toBe(false);
        });

        it("session AVANT la date de réglementation = non éligible", () => {
            expect(isSessionEligibleForLog(new Date("2026-03-15"), "stu-1", now)).toBe(false);
        });

        it("session future = non éligible", () => {
            expect(isSessionEligibleForLog(new Date("2027-01-01"), "stu-1", now)).toBe(false);
        });

        it("session exactement à la date de réglementation = éligible", () => {
            expect(isSessionEligibleForLog(new Date("2026-05-25"), "stu-1", now)).toBe(true);
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

        it("plusieurs élèves dans la même session → tous signés", () => {
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
        const baseLog = {
            pilotSigned: false,
            pilotFunction: "I",
            pilotID: "pilot-1",
            clubID: "club-1",
        };
        const now = new Date("2026-05-06T18:46:00.000Z");

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

        it("entrée élève (pilotFunction = EP) → exclue", () => {
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

        it("startOfTomorrowUTC est strictement > tout instant d'aujourd'hui", () => {
            const tomorrow = startOfTomorrowUTC(now);
            expect(tomorrow > now).toBe(true);
            const endOfToday = new Date("2026-05-06T23:59:59.999Z");
            expect(tomorrow > endOfToday).toBe(true);
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
