import { describe, it, expect } from "vitest";
import { convertMinutesToHours, formatSessionDate, formatSessionTime } from "../dateServeur";

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

/**
 * Consistency of session times displayed across the app.
 *
 * Contract: api/db/sessions.ts stores `sessionDateStart` via `setUTCHours()`, so
 * the Date's UTC hour matches the wall-clock hour entered by the user (e.g. 9am
 * entered → 09:00 UTC stored).
 *
 * Every component displaying a session time MUST therefore read it in UTC,
 * otherwise it drifts by 1 or 2 hours depending on the browser time zone. That
 * was the bug fixed in SessionDate.tsx (the popup showed 11am for a 9am session
 * in CEST). These tests lock the invariant.
 */
describe("formatSessionTime — cohérence des heures de session", () => {
    // Mirrors how sessions.ts builds a session: start from a local date on day D,
    // then set the hour in UTC.
    const buildSessionDate = (utcHour: number, utcMinute: number): Date => {
        const d = new Date(2026, 5, 15); // June 15 2026, local midnight
        d.setUTCHours(utcHour, utcMinute, 0, 0);
        return d;
    };

    it("retourne l'heure UTC stockée (ex. 9h saisi → \"09:00\")", () => {
        expect(formatSessionTime(buildSessionDate(9, 0))).toBe("09:00");
    });

    it("padde les heures sur 2 chiffres", () => {
        expect(formatSessionTime(buildSessionDate(7, 0))).toBe("07:00");
    });

    it("padde les minutes sur 2 chiffres", () => {
        expect(formatSessionTime(buildSessionDate(14, 5))).toBe("14:05");
    });

    it("supporte minuit et 23:59", () => {
        expect(formatSessionTime(buildSessionDate(0, 0))).toBe("00:00");
        expect(formatSessionTime(buildSessionDate(23, 59))).toBe("23:59");
    });

    it("ne dépend pas du fuseau horaire local du navigateur", () => {
        // A date built from an explicit UTC ISO string must always come out with the
        // same hours, whatever the runner's TZ.
        expect(formatSessionTime(new Date("2026-06-15T09:00:00.000Z"))).toBe("09:00");
        expect(formatSessionTime(new Date("2026-12-15T09:00:00.000Z"))).toBe("09:00");
    });

    it("regression bug popup : ne renvoie PAS l'heure locale (toLocaleTimeString)", () => {
        // If someone reintroduces `toLocaleTimeString('fr-FR', …)`, the returned hour
        // would be getHours() (local), not getUTCHours(). Check the expected offset on
        // any non-UTC time zone.
        const d = new Date("2026-06-15T09:00:00.000Z");
        const localFormat = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        const offsetMin = d.getTimezoneOffset(); // 0 if UTC, negative when ahead
        if (offsetMin !== 0) {
            // The runner is not in UTC: local output must differ from UTC output, otherwise
            // the helper (wrongly) uses local time.
            expect(formatSessionTime(d)).not.toBe(localFormat);
        }
        // Whatever the TZ, the expected output stays UTC.
        expect(formatSessionTime(d)).toBe("09:00");
    });

    it("est cohérent avec le formatage UTC du calendrier (Session.tsx, phone/Session.tsx)", () => {
        // The helper must reproduce exactly `${getUTCHours}:${getUTCMinutes}` padded to 2
        // digits: the contract shared by the popup and the calendar.
        const cases = [
            buildSessionDate(9, 0),
            buildSessionDate(14, 30),
            buildSessionDate(8, 5),
            new Date("2026-06-15T09:00:00.000Z"),
            new Date("2026-12-15T18:45:00.000Z"),
        ];
        for (const d of cases) {
            const expected = `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")}`;
            expect(formatSessionTime(d)).toBe(expected);
        }
    });

    it("aller-retour : durée ajoutée en ms → fin formatée correspond à start + durée", () => {
        // Exactly what calendar/Session.tsx computes to display the end.
        const start = buildSessionDate(9, 0);
        const durationMin = 60;
        const end = new Date(start.getTime() + durationMin * 60000);
        expect(formatSessionTime(start)).toBe("09:00");
        expect(formatSessionTime(end)).toBe("10:00");
    });

    it("régression AER-59 : la page Vols (TableRowComponent) ne doit pas décaler l'horaire de +2h en été", () => {
        // Reported bug: a session shown 09:00-10:00 in the calendar came out as
        // 11:00-12:00 on the Flights page. Cause: TableRowComponent formatted with
        // `date.toLocaleTimeString('fr-FR', …)` without `timeZone: "UTC"`, hence in the
        // browser time zone (CEST = UTC+2 in summer) instead of the stored wall-clock
        // hour. Reproduces TableRowComponent's computation: startDate then
        // endDate = start + duration.
        const sessionDateStart = new Date("2026-06-15T09:00:00.000Z");
        const sessionDateDuration_min = 60;
        const startDate = new Date(sessionDateStart);
        const endDate = new Date(startDate.getTime() + sessionDateDuration_min * 60000);

        expect(formatSessionTime(startDate)).toBe("09:00");
        expect(formatSessionTime(endDate)).toBe("10:00");

        // Explicit non-regression on the observed symptom (+2h, CEST).
        expect(formatSessionTime(startDate)).not.toBe("11:00");
        expect(formatSessionTime(endDate)).not.toBe("12:00");
    });
});

/**
 * Same invariant, for the DATE.
 *
 * Regression: the public discovery-flight booking page and the pending requests
 * table formatted with toLocaleDate/TimeString WITHOUT `timeZone`, hence in the
 * visitor's time zone: times came out +2 h in France in summer, and a late
 * evening slot changed day.
 */
describe("formatSessionDate — cohérence des dates de session", () => {
    it("accepte une date sérialisée (props RSC → composant client)", () => {
        expect(formatSessionTime("2026-08-12T14:00:00.000Z")).toBe("14:00");
        expect(formatSessionDate("2026-08-12T14:00:00.000Z")).toBe("mercredi 12 août");
    });

    it("ne bascule pas d'un jour sur un créneau de fin de soirée", () => {
        // 22:30 UTC = 00:30 the next day in Paris: without timeZone UTC, the displayed
        // date would move to August 13.
        const tard = new Date("2026-08-12T22:30:00.000Z");
        expect(formatSessionDate(tard, { day: "2-digit", month: "long" })).toBe("12 août");
        expect(formatSessionTime(tard)).toBe("22:30");
    });

    it("ne dépend pas du fuseau local (été comme hiver)", () => {
        const ete = new Date("2026-08-12T14:00:00.000Z");
        const hiver = new Date("2026-01-15T09:00:00.000Z");
        expect(formatSessionDate(ete, { day: "2-digit", month: "short" })).toBe("12 août");
        expect(formatSessionDate(hiver, { day: "2-digit", month: "short" })).toBe("15 janv.");
    });

    it("regression : ne renvoie PAS la date locale du navigateur", () => {
        // If someone removes `timeZone: "UTC"`, this slot would come out on August 13 on
        // any time zone ahead of UTC.
        const d = new Date("2026-08-12T23:30:00.000Z");
        const localFormat = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" });
        if (d.getTimezoneOffset() < 0) {
            expect(formatSessionDate(d, { day: "2-digit", month: "long" })).not.toBe(localFormat);
        }
        expect(formatSessionDate(d, { day: "2-digit", month: "long" })).toBe("12 août");
    });
});
