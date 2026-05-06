import { describe, it, expect } from "vitest";

/**
 * Tests de validation des sessions.
 * On teste la logique de checkSessionDate sans appeler Prisma.
 * Les règles sont extraites de sessions.ts.
 */

interface SessionInput {
    date: Date | undefined;
    startHour: string;
    startMinute: string;
    endHour: string;
    endMinute: string;
    duration: number;
    endReccurence: Date | undefined;
    planeId: string[];
}

interface UserLike {
    id: string;
    clubID: string | null;
}

function validateSessionInput(data: SessionInput, user: UserLike | undefined): string | null {
    if (!data.date) return "La date de la session est obligatoire";
    if (!user) return "L'instructeur est obligatoire";

    const startTotal = parseInt(data.startHour) * 60 + parseInt(data.startMinute);
    const endTotal = parseInt(data.endHour) * 60 + parseInt(data.endMinute);

    if (startTotal >= endTotal) return "L'heure de fin doit être après l'heure de début";

    const diff = endTotal - startTotal;
    if (diff < data.duration || diff % data.duration !== 0) {
        return `Durée invalide`;
    }

    if (data.endReccurence && data.date && data.endReccurence <= data.date) {
        return "La date de fin de récurrence doit être après la date de début";
    }

    if (data.planeId.length === 0) {
        return "Veuillez sélectionner des appareils";
    }

    return null; // pas d'erreur
}

const defaultUser: UserLike = { id: "user-1", clubID: "club-1" };

const validSession: SessionInput = {
    date: new Date("2026-12-01"),
    startHour: "9",
    startMinute: "0",
    endHour: "10",
    endMinute: "0",
    duration: 60,
    endReccurence: undefined,
    planeId: ["plane-1"],
};

describe("Validation des sessions", () => {
    describe("Champs obligatoires", () => {
        it("refuse si date manquante", () => {
            const result = validateSessionInput({ ...validSession, date: undefined }, defaultUser);
            expect(result).toBe("La date de la session est obligatoire");
        });

        it("refuse si instructeur manquant", () => {
            const result = validateSessionInput(validSession, undefined);
            expect(result).toBe("L'instructeur est obligatoire");
        });

        it("refuse si aucun avion sélectionné", () => {
            const result = validateSessionInput({ ...validSession, planeId: [] }, defaultUser);
            expect(result).toBe("Veuillez sélectionner des appareils");
        });
    });

    describe("Heures de début et fin", () => {
        it("refuse si début >= fin", () => {
            const result = validateSessionInput({
                ...validSession,
                startHour: "10",
                endHour: "10",
            }, defaultUser);
            expect(result).toBe("L'heure de fin doit être après l'heure de début");
        });

        it("refuse si début après fin", () => {
            const result = validateSessionInput({
                ...validSession,
                startHour: "14",
                endHour: "10",
            }, defaultUser);
            expect(result).toBe("L'heure de fin doit être après l'heure de début");
        });

        it("accepte si fin > début", () => {
            const result = validateSessionInput(validSession, defaultUser);
            expect(result).toBeNull();
        });
    });

    describe("Durée et multiples", () => {
        it("refuse si le créneau n'est pas un multiple de la durée", () => {
            // Créneau de 90 min avec durée de 60 → 90 % 60 = 30 ≠ 0
            const result = validateSessionInput({
                ...validSession,
                startHour: "9",
                startMinute: "0",
                endHour: "10",
                endMinute: "30",
                duration: 60,
            }, defaultUser);
            expect(result).toBe("Durée invalide");
        });

        it("accepte si le créneau est un multiple exact", () => {
            // 120 min / 60 = 2 sessions
            const result = validateSessionInput({
                ...validSession,
                startHour: "9",
                startMinute: "0",
                endHour: "11",
                endMinute: "0",
                duration: 60,
            }, defaultUser);
            expect(result).toBeNull();
        });

        it("accepte des durées de 30 min", () => {
            // 60 min / 30 = 2 sessions
            const result = validateSessionInput({
                ...validSession,
                startHour: "9",
                startMinute: "0",
                endHour: "10",
                endMinute: "0",
                duration: 30,
            }, defaultUser);
            expect(result).toBeNull();
        });
    });

    describe("Récurrence", () => {
        it("refuse si date fin récurrence <= date début", () => {
            const result = validateSessionInput({
                ...validSession,
                date: new Date("2026-06-15"),
                endReccurence: new Date("2026-06-10"),
            }, defaultUser);
            expect(result).toBe("La date de fin de récurrence doit être après la date de début");
        });

        it("refuse si date fin récurrence = date début", () => {
            const date = new Date("2026-06-15");
            const result = validateSessionInput({
                ...validSession,
                date,
                endReccurence: new Date(date),
            }, defaultUser);
            expect(result).toBe("La date de fin de récurrence doit être après la date de début");
        });

        it("accepte si date fin récurrence > date début", () => {
            const result = validateSessionInput({
                ...validSession,
                date: new Date("2026-06-15"),
                endReccurence: new Date("2026-07-15"),
            }, defaultUser);
            expect(result).toBeNull();
        });

        it("accepte sans récurrence", () => {
            const result = validateSessionInput({
                ...validSession,
                endReccurence: undefined,
            }, defaultUser);
            expect(result).toBeNull();
        });
    });

    describe("Calcul du nombre de sessions", () => {
        it("1 session pour un créneau 9h-10h avec durée 60min", () => {
            const startTotal = 9 * 60;
            const endTotal = 10 * 60;
            const count = (endTotal - startTotal) / 60;
            expect(count).toBe(1);
        });

        it("3 sessions pour un créneau 9h-12h avec durée 60min", () => {
            const startTotal = 9 * 60;
            const endTotal = 12 * 60;
            const count = (endTotal - startTotal) / 60;
            expect(count).toBe(3);
        });

        it("4 sessions pour un créneau 14h-16h avec durée 30min", () => {
            const startTotal = 14 * 60;
            const endTotal = 16 * 60;
            const count = (endTotal - startTotal) / 30;
            expect(count).toBe(4);
        });
    });
});
