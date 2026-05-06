import { describe, it, expect } from "vitest";
import { convertMinutesToHours, formatSessionTime } from "../dateServeur";

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
 * Cohérence des heures de session affichées dans l'application.
 *
 * Contrat : api/db/sessions.ts stocke `sessionDateStart` via `setUTCHours()`,
 * de sorte que l'heure UTC du `Date` correspond à l'heure « wall-clock » saisie
 * par l'utilisateur (ex. 9h saisi → 09:00 UTC stocké).
 *
 * Tous les composants qui affichent une heure de session DOIVENT donc lire en
 * UTC, sinon ils dérivent de 1 ou 2 heures selon le fuseau du navigateur.
 * C'est le bug qui a été corrigé dans SessionDate.tsx (la popup affichait 11h
 * pour une session de 9h en CEST).
 *
 * Ces tests verrouillent l'invariant pour éviter une régression.
 */
describe("formatSessionTime — cohérence des heures de session", () => {
    // Reproduit la façon dont sessions.ts construit une session : on part d'une
    // date locale au jour J, puis on positionne l'heure en UTC.
    const buildSessionDate = (utcHour: number, utcMinute: number): Date => {
        const d = new Date(2026, 5, 15); // 15 juin 2026, minuit local
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
        // Une date construite à partir d'un ISO UTC explicite doit toujours
        // ressortir avec les mêmes heures, peu importe le TZ du runner.
        expect(formatSessionTime(new Date("2026-06-15T09:00:00.000Z"))).toBe("09:00");
        expect(formatSessionTime(new Date("2026-12-15T09:00:00.000Z"))).toBe("09:00");
    });

    it("regression bug popup : ne renvoie PAS l'heure locale (toLocaleTimeString)", () => {
        // Si quelqu'un réintroduit `toLocaleTimeString('fr-FR', …)`, l'heure
        // retournée vaudrait getHours() (locale), pas getUTCHours(). On
        // vérifie l'écart attendu sur tout fuseau ≠ UTC.
        const d = new Date("2026-06-15T09:00:00.000Z");
        const localFormat = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        const offsetMin = d.getTimezoneOffset(); // 0 si UTC, négatif si en avance
        if (offsetMin !== 0) {
            // Le runner n'est pas en UTC : la sortie locale doit différer de
            // la sortie UTC, sinon le helper utilise (à tort) l'heure locale.
            expect(formatSessionTime(d)).not.toBe(localFormat);
        }
        // Quel que soit le TZ, la sortie attendue reste UTC.
        expect(formatSessionTime(d)).toBe("09:00");
    });

    it("est cohérent avec le formatage UTC du calendrier (Session.tsx, phone/Session.tsx)", () => {
        // Le helper doit reproduire exactement `${getUTCHours}:${getUTCMinutes}`
        // padés sur 2 chiffres — c'est le contrat partagé entre la popup et le
        // calendrier.
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
        // Exactement ce que calcule calendar/Session.tsx pour afficher la fin.
        const start = buildSessionDate(9, 0);
        const durationMin = 60;
        const end = new Date(start.getTime() + durationMin * 60000);
        expect(formatSessionTime(start)).toBe("09:00");
        expect(formatSessionTime(end)).toBe("10:00");
    });
});
