import { describe, it, expect } from "vitest";
import { mapFlightType } from "../logbook";

describe("mapFlightType", () => {
    it("mappe TRAINING -> INSTRUCTION", async () => {
        expect(await mapFlightType("TRAINING")).toBe("INSTRUCTION");
    });

    it("mappe PRIVATE -> LOCAL", async () => {
        expect(await mapFlightType("PRIVATE")).toBe("LOCAL");
    });

    it("mappe SIGHTSEEING -> VLO", async () => {
        expect(await mapFlightType("SIGHTSEEING")).toBe("VLO");
    });

    it("mappe DISCOVERY -> VLD", async () => {
        expect(await mapFlightType("DISCOVERY")).toBe("VLD");
    });

    it("mappe EXAM -> EXAM", async () => {
        expect(await mapFlightType("EXAM")).toBe("EXAM");
    });

    it("mappe FIRST_FLIGHT -> FIRST_FLIGHT", async () => {
        expect(await mapFlightType("FIRST_FLIGHT")).toBe("FIRST_FLIGHT");
    });

    it("mappe INITATION -> BAPTEME", async () => {
        expect(await mapFlightType("INITATION")).toBe("BAPTEME");
    });

    it("retourne INSTRUCTION par défaut pour null", async () => {
        expect(await mapFlightType(null)).toBe("INSTRUCTION");
    });

    it("retourne INSTRUCTION par défaut pour valeur inconnue", async () => {
        expect(await mapFlightType("UNKNOWN")).toBe("INSTRUCTION");
    });
});
