import { describe, it, expect } from "vitest";
import {
    groupLogsByMachine,
    canExportAircraftLogbook,
    signButtonState,
    shouldShowStudent,
} from "@/lib/logbookDisplay";

// ─────────────────────────────────────────────────────────────
// groupLogsByMachine — export « Tous les aéronefs »
// ─────────────────────────────────────────────────────────────

describe("groupLogsByMachine", () => {
    const mk = (id: string, planeID: string | null, reg: string, name: string) =>
        ({ id, planeID, planeRegistration: reg, planeName: name });

    it("regroupe les vols par machine et trie par immatriculation", () => {
        const logs = [
            mk("l1", "p-b", "F-BBBB", "Cessna"),
            mk("l2", "p-a", "F-AAAA", "Robin"),
            mk("l3", "p-b", "F-BBBB", "Cessna"),
        ];
        const groups = groupLogsByMachine(logs);
        expect(groups.map((g) => g.planeRegistration)).toEqual(["F-AAAA", "F-BBBB"]);
        expect(groups[0].logs.map((l) => l.id)).toEqual(["l2"]);
        expect(groups[1].logs.map((l) => l.id)).toEqual(["l1", "l3"]);
        expect(groups[1].planeName).toBe("Cessna");
    });

    it("regroupe par immatriculation quand planeID est null (machine supprimée)", () => {
        const logs = [
            mk("l1", null, "F-OLD", "Ancien"),
            mk("l2", null, "F-OLD", "Ancien"),
        ];
        const groups = groupLogsByMachine(logs);
        expect(groups).toHaveLength(1);
        expect(groups[0].planeRegistration).toBe("F-OLD");
        expect(groups[0].logs).toHaveLength(2);
    });

    it("une machine différente par planeID donne deux sections", () => {
        const logs = [
            mk("l1", "p-a", "F-AAAA", "Robin"),
            mk("l2", "p-b", "F-BBBB", "Cessna"),
        ];
        expect(groupLogsByMachine(logs)).toHaveLength(2);
    });

    it("liste vide → aucune section", () => {
        expect(groupLogsByMachine([])).toEqual([]);
    });
});

// ─────────────────────────────────────────────────────────────
// canExportAircraftLogbook — activation du bouton d'export
// ─────────────────────────────────────────────────────────────

describe("canExportAircraftLogbook", () => {
    it("faux si aucun vol", () => {
        expect(canExportAircraftLogbook([])).toBe(false);
    });

    it("vrai dès qu'il y a un vol (y compris en 'Tous les aéronefs')", () => {
        expect(canExportAircraftLogbook([{}])).toBe(true);
        expect(canExportAircraftLogbook([{}, {}])).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────
// signButtonState — colonne "Signé"
// ─────────────────────────────────────────────────────────────

describe("signButtonState", () => {
    const signed = { pilotSigned: true, pilotID: "pilot-1" };
    const unsigned = { pilotSigned: false, pilotID: "pilot-1" };

    it("vol signé → 'signed' (affiché même en lecture seule / autre utilisateur)", () => {
        expect(signButtonState(signed, "pilot-1", false)).toBe("signed");
        expect(signButtonState(signed, "someone-else", false)).toBe("signed");
        expect(signButtonState(signed, "pilot-1", true)).toBe("signed");
    });

    it("non signé + pilote du vol → 'signable'", () => {
        expect(signButtonState(unsigned, "pilot-1", false)).toBe("signable");
    });

    it("non signé + lecture seule → 'pending' (pas de bouton Signer)", () => {
        expect(signButtonState(unsigned, "pilot-1", true)).toBe("pending");
    });

    it("non signé + pas le pilote du vol → 'pending'", () => {
        expect(signButtonState(unsigned, "someone-else", false)).toBe("pending");
    });

    it("non signé + utilisateur inconnu → 'pending'", () => {
        expect(signButtonState(unsigned, undefined, false)).toBe("pending");
    });
});

// ─────────────────────────────────────────────────────────────
// shouldShowStudent — affichage de l'élève sur la ligne
// ─────────────────────────────────────────────────────────────

describe("shouldShowStudent", () => {
    it("vol d'instruction avec élève → true", () => {
        expect(shouldShowStudent({ flightNature: "INSTRUCTION", studentFirstName: "Marie", studentLastName: "Dupont" })).toBe(true);
        expect(shouldShowStudent({ flightNature: "INSTRUCTION", studentFirstName: null, studentLastName: "Dupont" })).toBe(true);
    });

    it("vol d'instruction sans élève → false", () => {
        expect(shouldShowStudent({ flightNature: "INSTRUCTION", studentFirstName: null, studentLastName: null })).toBe(false);
    });

    it("vol CDB (même avec un nom d'élève résiduel) → false", () => {
        expect(shouldShowStudent({ flightNature: "CDB", studentFirstName: "Marie", studentLastName: "Dupont" })).toBe(false);
    });
});
