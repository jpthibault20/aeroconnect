import { describe, it, expect } from "vitest";
import {
    HOBBS_END_BEFORE_START_ERROR,
    HOBBS_START_UNRESOLVED_ERROR,
    resolveCreateHobbsStart,
    resolveSignHobbsStart,
    resolveUpdateHobbs,
    validateHobbsRange,
} from "@/lib/logbookCalc";

/**
 * Server-side hobbsStart resolution rules, extracted from createFlightLog /
 * updateFlightLog / signFlightLog (src/api/db/logbook.ts).
 *
 * Security: a flight's start is the plane's counter reading, not a value chosen
 * by the pilot. Only OWNER/ADMIN can override it.
 */

describe("validateHobbsRange — fin > début", () => {
    it("accepte fin > début", () => {
        expect(validateHobbsRange(1345, 1346).ok).toBe(true);
    });

    it("refuse fin == début et fin < début", () => {
        expect(validateHobbsRange(1346, 1346)).toEqual({ ok: false, error: HOBBS_END_BEFORE_START_ERROR });
        expect(validateHobbsRange(1346, 1345)).toEqual({ ok: false, error: HOBBS_END_BEFORE_START_ERROR });
    });

    it("ne valide rien tant qu'une des deux bornes est inconnue", () => {
        expect(validateHobbsRange(null, 1346).ok).toBe(true);
        expect(validateHobbsRange(1346, null).ok).toBe(true);
        expect(validateHobbsRange(undefined, undefined).ok).toBe(true);
    });
});

describe("resolveCreateHobbsStart — début à la création", () => {
    describe("compteur connu", () => {
        it("PILOT : la valeur envoyée est ignorée, le début est le compteur", () => {
            expect(resolveCreateHobbsStart({ planeHobbsTotal: 1346, requested: 1300, canOverride: false })).toBe(1346);
        });

        it("PILOT sans valeur envoyée : le début est le compteur", () => {
            expect(resolveCreateHobbsStart({ planeHobbsTotal: 1346, requested: undefined, canOverride: false })).toBe(1346);
        });

        it("OWNER/ADMIN : la valeur envoyée remplace le compteur (override)", () => {
            // Use case: an earlier flight entered late (BOUR 06/09 after 08/09).
            expect(resolveCreateHobbsStart({ planeHobbsTotal: 1346, requested: 1344.25, canOverride: true })).toBe(1344.25);
        });

        it("OWNER/ADMIN sans valeur envoyée : le début reste le compteur", () => {
            expect(resolveCreateHobbsStart({ planeHobbsTotal: 1346, requested: undefined, canOverride: true })).toBe(1346);
        });
    });

    describe("compteur inconnu (machine jamais loguée)", () => {
        it("la première entrée initialise le début avec la valeur lue, quel que soit le rôle", () => {
            expect(resolveCreateHobbsStart({ planeHobbsTotal: null, requested: 1200.5, canOverride: false })).toBe(1200.5);
            expect(resolveCreateHobbsStart({ planeHobbsTotal: null, requested: 1200.5, canOverride: true })).toBe(1200.5);
        });

        it("sans valeur envoyée : début null (le client est censé l'exiger)", () => {
            expect(resolveCreateHobbsStart({ planeHobbsTotal: null, requested: undefined, canOverride: false })).toBeNull();
        });
    });
});

describe("resolveUpdateHobbs — modification d'une entrée", () => {
    const existing = { hobbsStart: 1345, hobbsEnd: 1346 };

    it("PILOT modifie seulement la fin : validée contre le début stocké", () => {
        const r = resolveUpdateHobbs({ existing, requestedStart: undefined, requestedEnd: 1347, canOverride: false });
        expect(r).toEqual({ ok: true, hobbsStart: 1345, hobbsEnd: 1347, startOverride: undefined });
    });

    it("PILOT envoie un début : ignoré silencieusement, rien n'est écrit pour hobbsStart", () => {
        const r = resolveUpdateHobbs({ existing, requestedStart: 1000, requestedEnd: 1347, canOverride: false });
        expect(r).toEqual({ ok: true, hobbsStart: 1345, hobbsEnd: 1347, startOverride: undefined });
    });

    it("PILOT envoie un début « pratique » pour contourner fin <= début stocké : refusé", () => {
        // Stored start 1345, wants an end of 1345 by lowering the start: rejected.
        const r = resolveUpdateHobbs({ existing, requestedStart: 1340, requestedEnd: 1345, canOverride: false });
        expect(r).toEqual({ ok: false, error: HOBBS_END_BEFORE_START_ERROR });
    });

    it("ADMIN corrige seulement le début : validé contre la fin stockée", () => {
        const ok = resolveUpdateHobbs({ existing, requestedStart: 1344.25, requestedEnd: undefined, canOverride: true });
        expect(ok).toEqual({ ok: true, hobbsStart: 1344.25, hobbsEnd: 1346, startOverride: 1344.25 });

        const ko = resolveUpdateHobbs({ existing, requestedStart: 1346, requestedEnd: undefined, canOverride: true });
        expect(ko).toEqual({ ok: false, error: HOBBS_END_BEFORE_START_ERROR });
    });

    it("ADMIN corrige début et fin simultanément : validés l'un contre l'autre", () => {
        const r = resolveUpdateHobbs({ existing, requestedStart: 1350, requestedEnd: 1351, canOverride: true });
        expect(r).toEqual({ ok: true, hobbsStart: 1350, hobbsEnd: 1351, startOverride: 1350 });
    });

    it("entrée historique sans début : la fin est acceptée sans validation de plage", () => {
        const r = resolveUpdateHobbs({
            existing: { hobbsStart: null, hobbsEnd: null },
            requestedStart: undefined,
            requestedEnd: 1347,
            canOverride: false,
        });
        expect(r).toEqual({ ok: true, hobbsStart: null, hobbsEnd: 1347, startOverride: undefined });
    });

    it("aucun champ hobbs envoyé : valeurs stockées inchangées", () => {
        const r = resolveUpdateHobbs({ existing, requestedStart: undefined, requestedEnd: undefined, canOverride: true });
        expect(r).toEqual({ ok: true, hobbsStart: 1345, hobbsEnd: 1346, startOverride: undefined });
    });
});

describe("resolveSignHobbsStart — début au moment de la signature", () => {
    it("début déjà figé à la création : conservé tel quel, quel que soit le compteur", () => {
        // The counter has moved since (other pilots): it must not be re-read.
        expect(resolveSignHobbsStart({ logStart: 1344.25, logEnd: 1345, planeHobbsTotal: 1349 }))
            .toEqual({ ok: true, hobbsStart: 1344.25 });
    });

    describe("entrée historique sans début (auto-créée)", () => {
        it("compteur encore cohérent (< fin) : figé sur le compteur", () => {
            expect(resolveSignHobbsStart({ logStart: null, logEnd: 1346, planeHobbsTotal: 1345 }))
                .toEqual({ ok: true, hobbsStart: 1345 });
        });

        it("compteur déjà au-delà de la fin : refus explicite, un admin doit renseigner le début", () => {
            expect(resolveSignHobbsStart({ logStart: null, logEnd: 1346, planeHobbsTotal: 1349.0167 }))
                .toEqual({ ok: false, error: HOBBS_START_UNRESOLVED_ERROR });
            expect(resolveSignHobbsStart({ logStart: null, logEnd: 1346, planeHobbsTotal: 1346 }).ok).toBe(false);
        });

        it("machine sans compteur : signature possible, début reste inconnu", () => {
            expect(resolveSignHobbsStart({ logStart: null, logEnd: 1346, planeHobbsTotal: null }))
                .toEqual({ ok: true, hobbsStart: null });
        });

        it("sans fin saisie : pas de refus ici (la fin obligatoire est contrôlée en amont)", () => {
            expect(resolveSignHobbsStart({ logStart: null, logEnd: null, planeHobbsTotal: 1349 }))
                .toEqual({ ok: true, hobbsStart: 1349 });
        });
    });
});
