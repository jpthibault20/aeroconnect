import { describe, it, expect } from "vitest";
import { convertMinutesToHours } from "../dateServeur";

describe("convertMinutesToHours", () => {
    it("convertit 0 minutes en 00H00", () => {
        expect(convertMinutesToHours(0)).toBe("00H00");
    });

    it("convertit 60 minutes en 01H00", () => {
        expect(convertMinutesToHours(60)).toBe("01H00");
    });

    it("convertit 90 minutes en 01H30", () => {
        expect(convertMinutesToHours(90)).toBe("01H30");
    });

    it("convertit 5 minutes en 00H05", () => {
        expect(convertMinutesToHours(5)).toBe("00H05");
    });

    it("convertit 125 minutes en 02H05", () => {
        expect(convertMinutesToHours(125)).toBe("02H05");
    });

    it("throw sur valeur négative", () => {
        expect(() => convertMinutesToHours(-1)).toThrow();
    });
});
