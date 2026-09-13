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
    advanceHobbsTotal,
    rollbackHobbsTotal,
} from "@/lib/logbookCalc";

/**
 * Tests des règles du carnet de vol (flight_logs).
 * Logique extraite de logbook.ts + helpers logbookCalc.ts.
 */

// --- Signature ---

function canSignFlight(authUserID: string, logPilotID: string, pilotSigned: boolean): { allowed: boolean; reason?: string } {
    if (authUserID !== logPilotID) return { allowed: false, reason: "Seul le pilote concerné peut signer" };
    if (pilotSigned) return { allowed: false, reason: "Entrée déjà signée" };
    return { allowed: true };
}

// --- Suppression ---

// Miroir fidèle de deleteFlightLog (src/api/db/logbook.ts). Ordre des contrôles :
//  1. requireAuth(LOGBOOK_WRITE_ROLES) — STUDENT et USER exclus du gate d'écriture.
//  2. isolation club — le vol doit appartenir au club de l'utilisateur.
//  3. vol signé → verrouillé, jamais supprimable ici (même OWNER/ADMIN).
//  4. sinon : OWNER/ADMIN suppriment n'importe quel vol non signé du club ;
//     tout autre rôle autorisé ne peut supprimer QUE son propre vol
//     (auth.user.id === log.pilotID) — cas d'usage : l'instructeur supprime le
//     log auto-créé d'une séance où l'élève ne s'est pas présenté.
const WRITE_ROLES: userRole[] = [userRole.PILOT, userRole.INSTRUCTOR, userRole.OWNER, userRole.ADMIN, userRole.MANAGER];
const OVERRIDE_ROLES: userRole[] = [userRole.OWNER, userRole.ADMIN];

function canDeleteFlightLog(
    role: userRole,
    authUserID: string,
    logPilotID: string,
    pilotSigned: boolean,
    authClubID: string,
    logClubID: string
): { allowed: boolean; reason?: string } {
    if (!WRITE_ROLES.includes(role)) return { allowed: false, reason: "Permissions insuffisantes" };
    if (authClubID !== logClubID) return { allowed: false, reason: "Permissions insuffisantes" };
    if (pilotSigned) return { allowed: false, reason: "Impossible de supprimer une entrée signée" };
    const canOverride = OVERRIDE_ROLES.includes(role);
    if (!canOverride && authUserID !== logPilotID) return { allowed: false, reason: "Permissions insuffisantes" };
    return { allowed: true };
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

    describe("Suppression d'un vol NON signé", () => {
        // Contexte commun : un vol non signé du club-1 appartenant à pilot-1.
        const UNSIGNED = false;

        describe("OWNER / ADMIN (override) — n'importe quel vol non signé du club", () => {
            it("OWNER supprime un vol non signé d'un autre pilote de son club", () => {
                const r = canDeleteFlightLog(userRole.OWNER, "owner-1", "pilot-1", UNSIGNED, "club-1", "club-1");
                expect(r.allowed).toBe(true);
            });

            it("ADMIN supprime un vol non signé d'un autre pilote de son club", () => {
                const r = canDeleteFlightLog(userRole.ADMIN, "admin-1", "pilot-1", UNSIGNED, "club-1", "club-1");
                expect(r.allowed).toBe(true);
            });
        });

        describe("Pilote propriétaire du vol — son propre vol non signé", () => {
            it("l'instructeur supprime le log auto-créé d'une séance (élève absent)", () => {
                // Cas d'usage principal : pilotID du log = instructeur.
                const r = canDeleteFlightLog(userRole.INSTRUCTOR, "instr-1", "instr-1", UNSIGNED, "club-1", "club-1");
                expect(r.allowed).toBe(true);
            });

            it("un PILOT supprime son propre vol non signé", () => {
                const r = canDeleteFlightLog(userRole.PILOT, "pilot-1", "pilot-1", UNSIGNED, "club-1", "club-1");
                expect(r.allowed).toBe(true);
            });

            it("un MANAGER supprime son propre vol non signé (mais pas ceux des autres)", () => {
                expect(canDeleteFlightLog(userRole.MANAGER, "mgr-1", "mgr-1", UNSIGNED, "club-1", "club-1").allowed).toBe(true);
                const other = canDeleteFlightLog(userRole.MANAGER, "mgr-1", "pilot-1", UNSIGNED, "club-1", "club-1");
                expect(other.allowed).toBe(false);
                expect(other.reason).toBe("Permissions insuffisantes");
            });
        });

        describe("Refus", () => {
            it("un pilote ne peut PAS supprimer le vol non signé d'un AUTRE pilote", () => {
                const r = canDeleteFlightLog(userRole.PILOT, "pilot-2", "pilot-1", UNSIGNED, "club-1", "club-1");
                expect(r.allowed).toBe(false);
                expect(r.reason).toBe("Permissions insuffisantes");
            });

            it("un INSTRUCTOR ne peut PAS supprimer le vol non signé d'un autre instructeur", () => {
                const r = canDeleteFlightLog(userRole.INSTRUCTOR, "instr-2", "instr-1", UNSIGNED, "club-1", "club-1");
                expect(r.allowed).toBe(false);
            });

            it("STUDENT est hors du gate d'écriture — ne peut PAS supprimer, même son propre vol", () => {
                const r = canDeleteFlightLog(userRole.STUDENT, "stu-1", "stu-1", UNSIGNED, "club-1", "club-1");
                expect(r.allowed).toBe(false);
                expect(r.reason).toBe("Permissions insuffisantes");
            });

            it("USER est hors du gate d'écriture — ne peut PAS supprimer", () => {
                const r = canDeleteFlightLog(userRole.USER, "user-1", "user-1", UNSIGNED, "club-1", "club-1");
                expect(r.allowed).toBe(false);
            });

            it("ne peut PAS supprimer un vol non signé d'un AUTRE club (même OWNER)", () => {
                const r = canDeleteFlightLog(userRole.OWNER, "owner-1", "pilot-1", UNSIGNED, "club-1", "club-2");
                expect(r.allowed).toBe(false);
                expect(r.reason).toBe("Permissions insuffisantes");
            });

            it("l'isolation club est vérifiée AVANT le statut signé", () => {
                // Un vol d'un autre club renvoie le refus club, pas le refus signé.
                const r = canDeleteFlightLog(userRole.OWNER, "owner-1", "pilot-1", true, "club-1", "club-2");
                expect(r.reason).toBe("Permissions insuffisantes");
            });
        });

        describe("Vol signé — verrouillé (contraste avec le non signé)", () => {
            it("OWNER ne peut PAS supprimer un vol signé de son club", () => {
                const r = canDeleteFlightLog(userRole.OWNER, "owner-1", "pilot-1", true, "club-1", "club-1");
                expect(r.allowed).toBe(false);
                expect(r.reason).toBe("Impossible de supprimer une entrée signée");
            });

            it("le pilote ne peut PAS supprimer son propre vol une fois signé", () => {
                const r = canDeleteFlightLog(userRole.PILOT, "pilot-1", "pilot-1", true, "club-1", "club-1");
                expect(r.allowed).toBe(false);
                expect(r.reason).toBe("Impossible de supprimer une entrée signée");
            });
        });
    });

    describe("Compteur moteur de l'aéronef (advanceHobbsTotal / rollbackHobbsTotal)", () => {
        describe("avancement", () => {
            it("compteur inconnu : la première fin l'initialise", () => {
                expect(advanceHobbsTotal(null, null, 1338.6667)).toBe(1338.6667);
            });

            it("fin non saisie : compteur inchangé", () => {
                expect(advanceHobbsTotal(1346, null, null)).toBe(1346);
                expect(advanceHobbsTotal(null, null, undefined)).toBeNull();
            });

            it("création dans l'ordre : le compteur avance à la fin saisie", () => {
                expect(advanceHobbsTotal(1345, null, 1346)).toBe(1346);
            });

            it("vol antérieur saisi en retard (fin < compteur) : le compteur ne recule PAS", () => {
                // Cas prod : BOUR signe son 06/09 (fin 1345) après le 08/09 (fin 1346).
                expect(advanceHobbsTotal(1346, null, 1345)).toBe(1346);
            });

            it("correction de la fin de l'entrée en tête : sa nouvelle fin remplace le compteur", () => {
                // L'entrée en tête (fin 1349.0167 = compteur) est corrigée à 1347.
                expect(advanceHobbsTotal(1349.0167, 1349.0167, 1347)).toBe(1347);
            });

            it("correction de la fin d'une entrée qui n'est plus en tête : max, jamais de recul", () => {
                expect(advanceHobbsTotal(1349, 1346, 1345.5)).toBe(1349);
                expect(advanceHobbsTotal(1349, 1346, 1350)).toBe(1350);
            });

            it("égalité de tête tolérante aux arrondis à 4 décimales", () => {
                expect(advanceHobbsTotal(1349.0167, 1349.01670000001, 1347)).toBe(1347);
            });
        });

        describe("suppression d'une entrée non signée", () => {
            it("entrée en tête : le compteur revient à son début", () => {
                expect(rollbackHobbsTotal(1349.0167, { hobbsStart: 1346, hobbsEnd: 1349.0167 })).toBe(1346);
            });

            it("entrée dépassée par un vol suivant : compteur inchangé", () => {
                expect(rollbackHobbsTotal(1350, { hobbsStart: 1346, hobbsEnd: 1349.0167 })).toBe(1350);
            });

            it("entrée sans fin ou compteur inconnu : compteur inchangé", () => {
                expect(rollbackHobbsTotal(1350, { hobbsStart: 1346, hobbsEnd: null })).toBe(1350);
                expect(rollbackHobbsTotal(null, { hobbsStart: 1346, hobbsEnd: 1349 })).toBeNull();
            });

            it("entrée en tête sans début connu : on garde le compteur plutôt que de le perdre", () => {
                expect(rollbackHobbsTotal(1349, { hobbsStart: null, hobbsEnd: 1349 })).toBe(1349);
            });
        });

        it("rejoue la chronologie prod du 05 au 13/09 sans corrompre le compteur", () => {
            // Chaque étape = plane.hobbsTotal après l'action, avec la nouvelle règle.
            let counter: number | null = 1344.25;                 // 05/09 signé 1344 -> 1344:15

            counter = advanceHobbsTotal(counter, null, 1345);     // 06/09 BOUR crée (non signé) 1344:15 -> 1345
            expect(counter).toBe(1345);

            counter = advanceHobbsTotal(counter, null, 1346);     // 08/09 JP crée+signe 1345 -> 1346
            expect(counter).toBe(1346);

            counter = advanceHobbsTotal(counter, null, 1345);     // 08/09 BOUR signe enfin son 06/09
            expect(counter).toBe(1346);                           // ← ne recule plus (bug B)

            // 12/09 : le début proposé est 1346, pas 1345.
            const start12 = counter;
            expect(start12).toBe(1346);
            counter = advanceHobbsTotal(counter, null, 1347.5);   // 12/09 JP crée (non signé)
            expect(counter).toBe(1347.5);

            // Il s'aperçoit d'une faute de frappe et supprime l'entrée : retour au début.
            counter = rollbackHobbsTotal(counter, { hobbsStart: start12, hobbsEnd: 1347.5 });
            expect(counter).toBe(1346);                           // ← plus de compteur fantôme (bug A)
        });

        it("deux pilotes croisés : correction et suppression ne touchent que l'entrée en tête", () => {
            let counter: number | null = 1346;

            // A crée 1346 -> 1347, puis B crée 1347 -> 1348.5 : B est en tête.
            const a = { hobbsStart: 1346, hobbsEnd: 1347 };
            counter = advanceHobbsTotal(counter, null, a.hobbsEnd);
            const b = { hobbsStart: counter as number, hobbsEnd: 1348.5 };
            expect(b.hobbsStart).toBe(1347);
            counter = advanceHobbsTotal(counter, null, b.hobbsEnd);
            expect(counter).toBe(1348.5);

            // A corrige sa fin (faute de frappe 1347 -> 1346.75) : plus en tête, pas de recul.
            counter = advanceHobbsTotal(counter, a.hobbsEnd, 1346.75);
            expect(counter).toBe(1348.5);

            // A supprime son entrée : pas en tête, compteur inchangé.
            counter = rollbackHobbsTotal(counter, { ...a, hobbsEnd: 1346.75 });
            expect(counter).toBe(1348.5);

            // B supprime la sienne : en tête, retour au début de B (1347), pas à celui de A.
            counter = rollbackHobbsTotal(counter, b);
            expect(counter).toBe(1347);
        });
    });
});
