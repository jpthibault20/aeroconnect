import { describe, it, expect } from "vitest";
import { mapFlightType } from "../logbook";

describe("mapFlightType", () => {
    it("mappe TRAINING -> INSTRUCTION", () => {
        expect(mapFlightType("TRAINING")).toBe("INSTRUCTION");
    });

    it("mappe PRIVATE -> LOCAL", () => {
        expect(mapFlightType("PRIVATE")).toBe("LOCAL");
    });

    it("mappe SIGHTSEEING -> VLO", () => {
        expect(mapFlightType("SIGHTSEEING")).toBe("VLO");
    });

    it("mappe DISCOVERY -> VLD", () => {
        expect(mapFlightType("DISCOVERY")).toBe("VLD");
    });

    it("mappe EXAM -> EXAM", () => {
        expect(mapFlightType("EXAM")).toBe("EXAM");
    });

    it("mappe FIRST_FLIGHT -> FIRST_FLIGHT", () => {
        expect(mapFlightType("FIRST_FLIGHT")).toBe("FIRST_FLIGHT");
    });

    it("mappe INITATION -> BAPTEME", () => {
        expect(mapFlightType("INITATION")).toBe("BAPTEME");
    });

    it("retourne INSTRUCTION par défaut pour null", () => {
        expect(mapFlightType(null)).toBe("INSTRUCTION");
    });

    it("retourne INSTRUCTION par défaut pour valeur inconnue", () => {
        expect(mapFlightType("UNKNOWN")).toBe("INSTRUCTION");
    });
});
