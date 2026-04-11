import { describe, it, expect } from "vitest";

/**
 * Logique de validation des heures moteur extraite des composants
 * CompleteFlightDialog et SessionPopup.
 * On teste la logique pure, pas les composants.
 */

type ValidationResult = { valid: true } | { valid: false; message: string };

function validateHobbs(
    hobbsStart: string,
    hobbsEnd: string,
    hasPlane: boolean,
    isSigning: boolean
): ValidationResult {
    if (!hasPlane) return { valid: true };

    if (isSigning) {
        if (!hobbsStart || isNaN(parseFloat(hobbsStart))) {
            return { valid: false, message: "Les heures moteur de début sont obligatoires pour signer." };
        }
        if (!hobbsEnd || isNaN(parseFloat(hobbsEnd)) || parseFloat(hobbsEnd) <= parseFloat(hobbsStart)) {
            return { valid: false, message: "Les heures moteur de fin doivent être supérieures à celles de début." };
        }
    } else if (hobbsStart && hobbsEnd && parseFloat(hobbsEnd) <= parseFloat(hobbsStart)) {
        return { valid: false, message: "Les heures moteur de fin doivent être supérieures à celles de début." };
    }

    return { valid: true };
}

describe("Validation heures moteur", () => {
    describe("avec avion - signature", () => {
        it("refuse si début vide", () => {
            const result = validateHobbs("", "100", true, true);
            expect(result.valid).toBe(false);
        });

        it("refuse si début invalide (NaN)", () => {
            const result = validateHobbs("abc", "100", true, true);
            expect(result.valid).toBe(false);
        });

        it("refuse si fin vide", () => {
            const result = validateHobbs("100", "", true, true);
            expect(result.valid).toBe(false);
        });

        it("refuse si fin <= début", () => {
            const result = validateHobbs("100", "100", true, true);
            expect(result.valid).toBe(false);
        });

        it("refuse si fin < début", () => {
            const result = validateHobbs("100", "99", true, true);
            expect(result.valid).toBe(false);
        });

        it("accepte si fin > début", () => {
            const result = validateHobbs("100", "101.5", true, true);
            expect(result.valid).toBe(true);
        });
    });

    describe("avec avion - enregistrement simple", () => {
        it("accepte si les deux sont vides", () => {
            const result = validateHobbs("", "", true, false);
            expect(result.valid).toBe(true);
        });

        it("accepte si seul le début est rempli", () => {
            const result = validateHobbs("100", "", true, false);
            expect(result.valid).toBe(true);
        });

        it("refuse si fin <= début quand les deux sont remplis", () => {
            const result = validateHobbs("100", "99", true, false);
            expect(result.valid).toBe(false);
        });

        it("accepte si fin > début quand les deux sont remplis", () => {
            const result = validateHobbs("100", "105", true, false);
            expect(result.valid).toBe(true);
        });
    });

    describe("sans avion (noPlane)", () => {
        it("accepte toujours pour la signature", () => {
            const result = validateHobbs("", "", false, true);
            expect(result.valid).toBe(true);
        });

        it("accepte toujours pour l'enregistrement", () => {
            const result = validateHobbs("", "", false, false);
            expect(result.valid).toBe(true);
        });
    });
});
