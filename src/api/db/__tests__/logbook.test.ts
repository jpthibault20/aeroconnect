import { describe, it, expect } from "vitest";
import { mapFlightType } from "../logbook";

describe("mapFlightType (compat. flight_sessions → flight_logs)", () => {
    it("TRAINING → INSTRUCTION + LOCAL", async () => {
        expect(await mapFlightType("TRAINING")).toEqual({ nature: "INSTRUCTION", subType: "LOCAL" });
    });

    it("PRIVATE → CDB (sans sous-type)", async () => {
        expect(await mapFlightType("PRIVATE")).toEqual({ nature: "CDB", subType: null });
    });

    it("SIGHTSEEING → INSTRUCTION + LOCAL", async () => {
        expect(await mapFlightType("SIGHTSEEING")).toEqual({ nature: "INSTRUCTION", subType: "LOCAL" });
    });

    it("DISCOVERY → INSTRUCTION + BAPTEME", async () => {
        expect(await mapFlightType("DISCOVERY")).toEqual({ nature: "INSTRUCTION", subType: "BAPTEME" });
    });

    it("EXAM → INSTRUCTION + EXAM", async () => {
        expect(await mapFlightType("EXAM")).toEqual({ nature: "INSTRUCTION", subType: "EXAM" });
    });

    it("FIRST_FLIGHT → INSTRUCTION + BAPTEME", async () => {
        expect(await mapFlightType("FIRST_FLIGHT")).toEqual({ nature: "INSTRUCTION", subType: "BAPTEME" });
    });

    it("INITATION → INSTRUCTION + BAPTEME", async () => {
        expect(await mapFlightType("INITATION")).toEqual({ nature: "INSTRUCTION", subType: "BAPTEME" });
    });

    it("null → fallback INSTRUCTION + LOCAL", async () => {
        expect(await mapFlightType(null)).toEqual({ nature: "INSTRUCTION", subType: "LOCAL" });
    });

    it("valeur inconnue → fallback INSTRUCTION + LOCAL", async () => {
        expect(await mapFlightType("UNKNOWN")).toEqual({ nature: "INSTRUCTION", subType: "LOCAL" });
    });
});
