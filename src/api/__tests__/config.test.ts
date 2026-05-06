import { describe, it, expect } from "vitest";
import { aircraftClasses, defaultMinutes, defaultHours, monthFr, dayFr } from "@/config/config";

describe("Configuration", () => {
    describe("aircraftClasses", () => {
        it("contient 6 classes ULM", () => {
            expect(aircraftClasses).toHaveLength(6);
        });

        it("chaque classe a un id, label et color", () => {
            for (const cls of aircraftClasses) {
                expect(cls).toHaveProperty("id");
                expect(cls).toHaveProperty("label");
                expect(cls).toHaveProperty("color");
                expect(typeof cls.id).toBe("number");
                expect(typeof cls.label).toBe("string");
            }
        });

        it("les ids sont uniques", () => {
            const ids = aircraftClasses.map(c => c.id);
            expect(new Set(ids).size).toBe(ids.length);
        });

        it("contient les classes attendues", () => {
            const labels = aircraftClasses.map(c => c.label);
            expect(labels).toContain("Paramoteur");
            expect(labels).toContain("Multiaxe");
            expect(labels).toContain("Hélicoptère");
        });
    });

    describe("defaultMinutes", () => {
        it("contient 00, 15, 30, 45", () => {
            expect(defaultMinutes).toEqual(["00", "15", "30", "45"]);
        });
    });

    describe("defaultHours", () => {
        it("commence à 9h et finit à 19h", () => {
            expect(defaultHours[0]).toBe(9);
            expect(defaultHours[defaultHours.length - 1]).toBe(19);
        });
    });

    describe("monthFr", () => {
        it("contient 12 mois en français", () => {
            expect(monthFr).toHaveLength(12);
            expect(monthFr[0]).toBe("Janvier");
            expect(monthFr[11]).toBe("Décembre");
        });
    });

    describe("dayFr", () => {
        it("contient 7 jours en français commençant par Lundi", () => {
            expect(dayFr).toHaveLength(7);
            expect(dayFr[0]).toBe("Lundi");
            expect(dayFr[6]).toBe("Dimanche");
        });
    });
});
