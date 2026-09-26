import { describe, expect, it } from "vitest";
import { formatTime } from "@/api/date";

describe("formatTime", () => {
    it("formate une heure entière", () => {
        expect(formatTime(8)).toBe("08:00");
        expect(formatTime(14)).toBe("14:00");
        expect(formatTime(0)).toBe("00:00");
    });

    it("traite la partie décimale comme une fraction d'heure", () => {
        expect(formatTime(8.5)).toBe("08:30");
        expect(formatTime(8.25)).toBe("08:15");
        expect(formatTime(8.75)).toBe("08:45");
    });

    it("arrondit à la minute sans produire « :60 »", () => {
        expect(formatTime(8.9999)).toBe("09:00");
        expect(formatTime(10 + 1 / 3)).toBe("10:20");
    });
});
