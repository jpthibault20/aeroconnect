import { describe, it, expect } from "vitest";
import { formatPilotName } from "../formatPilotName";

describe("formatPilotName", () => {
    it("formate 'Jean' 'Dupont' en 'D. jean'", () => {
        // Note: the function takes (firstName, lastName) but uses
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
        // charAt(0) on "" returns "" and toUpperCase() returns ""
        const result = formatPilotName("", "");
        expect(result).toBe(". ");
    });
});
