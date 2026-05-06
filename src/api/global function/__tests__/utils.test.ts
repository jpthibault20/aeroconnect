import { describe, it, expect } from "vitest";
import { cuuid } from "../cuuid";
import { formatPilotName } from "../formatPilotName";

describe("cuuid", () => {
    it("retourne une chaîne au format UUID (36 caractères avec tirets)", () => {
        const id = cuuid();
        expect(id).toHaveLength(36);
        expect(id.split("-")).toHaveLength(5);
    });

    it("les segments ont les bonnes longueurs (8-4-4-4-12)", () => {
        const id = cuuid();
        const parts = id.split("-");
        expect(parts[0]).toHaveLength(8);
        expect(parts[1]).toHaveLength(4);
        expect(parts[2]).toHaveLength(4);
        expect(parts[3]).toHaveLength(4);
        expect(parts[4]).toHaveLength(12);
    });

    it("génère des valeurs différentes à chaque appel", () => {
        const ids = new Set(Array.from({ length: 20 }, () => cuuid()));
        expect(ids.size).toBe(20);
    });

    it("ne contient que des caractères hex et des tirets", () => {
        const id = cuuid();
        expect(id).toMatch(/^[0-9a-f-]+$/);
    });
});

describe("formatPilotName", () => {
    it("formate 'Jean' 'Dupont' en 'D. jean'", () => {
        // Note : la fonction prend (firstName, lastName) mais utilise
        // lastName.charAt(0) + firstName.toLowerCase()
        const result = formatPilotName("Jean", "Dupont");
        expect(result).toBe("D. jean");
    });

    it("met la première lettre du nom en majuscule", () => {
        const result = formatPilotName("pierre", "martin");
        expect(result).toBe("M. pierre");
    });

    it("met le prénom en minuscule", () => {
        const result = formatPilotName("PAUL", "Durand");
        expect(result).toBe("D. paul");
    });

    it("gère les chaînes vides sans crash", () => {
        // charAt(0) sur "" retourne "" et toUpperCase() retourne ""
        const result = formatPilotName("", "");
        expect(result).toBe(". ");
    });
});
