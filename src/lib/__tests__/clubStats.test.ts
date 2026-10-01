import { describe, expect, it } from "vitest";
import { flightNature, pilotFunction, WalletTransactionType } from "@prisma/client";
import {
    clubDay,
    computeActivity,
    computeFlightStats,
    computeWalletStats,
    FlightLogStatInput,
    formatEuros,
    formatEurosShort,
    formatMinutes,
    formatMinutesDelta,
    instantBounds,
    monthBuckets,
    percentChange,
    rankBy,
    resolvePeriodWindow,
    StatTransaction,
    toStatLog,
    transactionAmount,
    utcDay,
    windowBounds,
} from "../clubStats";

const iso = (d: Date) => d.toISOString().slice(0, 10);

// ─── Periods ───

describe("resolvePeriodWindow", () => {
    const today = utcDay(2026, 8, 10);

    it("mois : en cours à date, précédent à la même date, semaines", () => {
        const w = resolvePeriodWindow("month", today);
        expect(iso(w.current.from)).toBe("2026-09-01");
        expect(iso(w.current.to)).toBe("2026-09-10");
        expect(iso(w.previous.from)).toBe("2026-08-01");
        expect(iso(w.previous.to)).toBe("2026-08-10");
        expect(w.buckets.map((b) => b.label)).toEqual(["S1", "S2", "S3", "S4", "S5"]);
        expect(iso(w.buckets[4].from)).toBe("2026-09-29");
        expect(iso(w.buckets[4].to)).toBe("2026-09-30");
        expect(iso(w.previousBuckets[4].to)).toBe("2026-08-31");
        expect(w.currentLabel).toBe("septembre 2026");
        expect(w.comparisonLabel).toBe("vs août");
    });

    it("mois : borne le jour au dernier jour du mois précédent", () => {
        const w = resolvePeriodWindow("month", utcDay(2026, 2, 31));
        expect(iso(w.previous.to)).toBe("2026-02-28");
        expect(w.previousBuckets.map((b) => b.label)).toEqual(["S1", "S2", "S3", "S4"]);
    });

    it("mois : janvier se compare à décembre de l'année précédente", () => {
        const w = resolvePeriodWindow("month", utcDay(2026, 0, 15));
        expect(iso(w.previous.from)).toBe("2025-12-01");
        expect(iso(w.previous.to)).toBe("2025-12-15");
        expect(w.previousLabel).toBe("décembre 2025");
    });

    it("année : janvier à aujourd'hui, comparée à la même date l'an passé", () => {
        const w = resolvePeriodWindow("year", today);
        expect(iso(w.current.from)).toBe("2026-01-01");
        expect(iso(w.previous.from)).toBe("2025-01-01");
        expect(iso(w.previous.to)).toBe("2025-09-10");
        expect(w.buckets).toHaveLength(9);
        expect(w.buckets[8].label).toBe("Sept.");
        expect(iso(w.previousBuckets[0].from)).toBe("2025-01-01");
        expect(w.comparisonLabel).toBe("vs 2025");
    });

    it("12 mois glissants : mois en cours et 11 précédents", () => {
        const w = resolvePeriodWindow("rolling12", today);
        expect(iso(w.current.from)).toBe("2025-10-01");
        expect(iso(w.previous.from)).toBe("2024-10-01");
        expect(iso(w.previous.to)).toBe("2025-09-10");
        expect(w.buckets.map((b) => b.label)[0]).toBe("Oct.");
        expect(w.buckets).toHaveLength(12);
        expect(iso(w.previousBuckets[11].to)).toBe("2025-09-30");
    });

    it("windowBounds couvre la période précédente complète", () => {
        const b = windowBounds(resolvePeriodWindow("month", today));
        expect(iso(b.from)).toBe("2026-08-01");
        expect(iso(b.to)).toBe("2026-09-30");
    });
});

describe("clubDay / instantBounds", () => {
    it("ramène un instant au jour du club (Europe/Paris)", () => {
        // August 31 23:30 UTC = September 1 01:30 in Paris
        expect(iso(clubDay(new Date("2026-08-31T23:30:00Z")))).toBe("2026-09-01");
        expect(iso(clubDay(new Date("2026-09-01T10:00:00Z")))).toBe("2026-09-01");
    });

    it("élargit les bornes d'un jour de chaque côté", () => {
        const b = instantBounds({ from: utcDay(2026, 8, 1), to: utcDay(2026, 8, 30) });
        expect(b.gte.toISOString()).toBe("2026-08-31T00:00:00.000Z");
        expect(b.lt.toISOString()).toBe("2026-10-02T00:00:00.000Z");
    });

    it("monthBuckets traverse l'année", () => {
        expect(monthBuckets(2026, 1, 3).map((b) => b.label)).toEqual(["Déc.", "Janv.", "Févr."]);
    });
});

// ─── Logbook ───

const baseLog: FlightLogStatInput = {
    date: utcDay(2026, 8, 5),
    hobbsStart: 100,
    hobbsEnd: 101.5,
    planeName: "Ikarus C42",
    planeRegistration: "F-JDEF",
    flightNature: flightNature.INSTRUCTION,
    pilotID: "inst",
    pilotFirstName: "Paul",
    pilotLastName: "Durand",
    pilotFunction: pilotFunction.I,
    instructorID: null,
    instructorFirstName: null,
    instructorLastName: null,
    studentID: "eleve",
    studentFirstName: "Léa",
    studentLastName: "Martin",
};

describe("toStatLog", () => {
    it("instruction saisie par l'instructeur : il est l'instructeur, l'élève vient de student*", () => {
        const l = toStatLog(baseLog);
        expect(l.minutes).toBe(90);
        expect(l.instructorID).toBe("inst");
        expect(l.instructorName).toBe("DURAND P.");
        expect(l.studentID).toBe("eleve");
        expect(l.studentName).toBe("MARTIN L.");
    });

    it("instruction saisie par l'élève (EP) : il est l'élève", () => {
        const l = toStatLog({
            ...baseLog,
            pilotID: "eleve",
            pilotFirstName: "Léa",
            pilotLastName: "Martin",
            pilotFunction: pilotFunction.EP,
            instructorID: "inst",
            instructorFirstName: "Paul",
            instructorLastName: "Durand",
            studentID: null,
            studentFirstName: null,
            studentLastName: null,
        });
        expect(l.studentID).toBe("eleve");
        expect(l.instructorID).toBe("inst");
        expect(l.instructorName).toBe("DURAND P.");
    });

    it("vol solo (CDB) : ni instructeur ni élève", () => {
        const l = toStatLog({ ...baseLog, flightNature: flightNature.CDB, pilotFunction: pilotFunction.P, studentID: null });
        expect(l.instructorID).toBeNull();
        expect(l.studentID).toBeNull();
    });

    it("compteur incomplet : 0 minute", () => {
        expect(toStatLog({ ...baseLog, hobbsEnd: null }).minutes).toBe(0);
    });
});

describe("computeFlightStats", () => {
    const w = resolvePeriodWindow("month", utcDay(2026, 8, 10));
    const logs = [
        toStatLog(baseLog), // Sept 5, 90 min, Ikarus, student
        toStatLog({ ...baseLog, date: utcDay(2026, 8, 9), hobbsEnd: 100.5, planeName: "Savannah", planeRegistration: "F-JABC" }),
        toStatLog({ ...baseLog, date: utcDay(2026, 7, 3), hobbsEnd: 101 }), // Aug 3, 60 min (previous period)
        toStatLog({ ...baseLog, date: utcDay(2026, 7, 20), hobbsEnd: 102 }), // Aug 20: outside the to-date comparison, but in the chart
    ];
    const stats = computeFlightStats(logs, w);

    it("chiffres clés à date", () => {
        expect(stats.minutes).toBe(120);
        expect(stats.flights).toBe(2);
        expect(stats.previousMinutes).toBe(60);
        expect(stats.previousFlights).toBe(1);
        expect(stats.students).toBe(1);
    });

    it("série : semaines en cours et mois précédent complet", () => {
        expect(stats.series[0]).toEqual({ label: "S1", current: 90, previous: 60 });
        expect(stats.series[1]).toEqual({ label: "S2", current: 30, previous: 0 });
        expect(stats.series[2]).toEqual({ label: "S3", current: 0, previous: 120 });
    });

    it("classements de la période en cours", () => {
        expect(stats.byPlane.map((r) => [r.label, r.value, r.count])).toEqual([["Ikarus C42", 90, 1], ["Savannah", 30, 1]]);
        expect(stats.byInstructor).toEqual([{ key: "inst", label: "DURAND P.", sub: null, value: 120, count: 2 }]);
        expect(stats.byStudent[0].value).toBe(120);
    });
});

describe("rankBy / percentChange", () => {
    it("trie par valeur puis par libellé, ignore les clés nulles et les totaux nuls", () => {
        const rows = rankBy(
            [{ k: "b", v: 5 }, { k: "a", v: 5 }, { k: null, v: 9 }, { k: "c", v: 0 }, { k: "d", v: 7 }],
            (x) => x.k,
            (x) => x.k ?? "",
            () => null,
            (x) => x.v
        );
        expect(rows.map((r) => r.key)).toEqual(["d", "a", "b"]);
    });

    it("variation en %, null sans base de comparaison", () => {
        expect(percentChange(110, 100)).toBe(10);
        expect(percentChange(50, 100)).toBe(-50);
        expect(percentChange(10, 0)).toBeNull();
    });
});

// ─── Wallets ───

const tx = (over: Partial<StatTransaction>): StatTransaction => ({
    day: utcDay(2026, 8, 5),
    type: WalletTransactionType.CREDIT,
    amountCents: 10_000,
    flightLogID: null,
    userID: "eleve",
    planeName: null,
    planeRegistration: null,
    ...over,
});

describe("transactionAmount", () => {
    it("encaissé : crédits seulement", () => {
        expect(transactionAmount(tx({}), "cashed")).toBe(10_000);
        expect(transactionAmount(tx({ type: WalletTransactionType.DEBIT, amountCents: -5_000, flightLogID: "l" }), "cashed")).toBe(0);
    });

    it("facturé : débits et corrections rattachés à un vol, en positif", () => {
        expect(transactionAmount(tx({ type: WalletTransactionType.DEBIT, amountCents: -5_000, flightLogID: "l" }), "billed")).toBe(5_000);
        expect(transactionAmount(tx({ type: WalletTransactionType.ADJUSTMENT, amountCents: 1_000, flightLogID: "l" }), "billed")).toBe(-1_000);
        // Manual withdrawal: neither cashed nor billed
        expect(transactionAmount(tx({ type: WalletTransactionType.ADJUSTMENT, amountCents: -2_000 }), "billed")).toBe(0);
        expect(transactionAmount(tx({}), "billed")).toBe(0);
    });
});

describe("computeWalletStats", () => {
    const w = resolvePeriodWindow("month", utcDay(2026, 8, 10));
    const debit = (amount: number, plane: string, reg: string, userID = "eleve") =>
        tx({ type: WalletTransactionType.DEBIT, amountCents: -amount, flightLogID: "l", planeName: plane, planeRegistration: reg, userID });
    const txs = [
        tx({}),
        tx({ userID: "autre", amountCents: 3_000 }),
        debit(6_000, "Ikarus C42", "F-JDEF"),
        debit(2_000, "Savannah", "F-JABC", "autre"),
        tx({ day: utcDay(2026, 7, 2), amountCents: 4_000 }),
    ];
    const stats = computeWalletStats(txs, w, (id) => id.toUpperCase());

    it("encaissé", () => {
        expect(stats.cashed.total).toBe(13_000);
        expect(stats.cashed.previousTotal).toBe(4_000);
        expect(stats.cashed.count).toBe(2);
        expect(stats.cashed.byMember.map((r) => [r.label, r.value])).toEqual([["ELEVE", 10_000], ["AUTRE", 3_000]]);
        expect(stats.cashed.byPlane).toEqual([]);
    });

    it("facturé, avec répartition par machine", () => {
        expect(stats.billed.total).toBe(8_000);
        expect(stats.billed.count).toBe(2);
        expect(stats.billed.byPlane.map((r) => [r.label, r.sub, r.value])).toEqual([
            ["Ikarus C42", "F-JDEF", 6_000],
            ["Savannah", "F-JABC", 2_000],
        ]);
        expect(stats.billed.series[0].current).toBe(8_000);
    });
});

describe("computeActivity", () => {
    it("heures et encaissé par mois", () => {
        const buckets = monthBuckets(2026, 8, 2);
        const logs = [toStatLog(baseLog), toStatLog({ ...baseLog, date: utcDay(2026, 7, 1) })];
        const points = computeActivity(logs, [tx({})], buckets);
        expect(points).toEqual([
            { label: "Août", minutes: 90, cashedCents: 0 },
            { label: "Sept.", minutes: 90, cashedCents: 10_000 },
        ]);
    });
});

describe("formatMinutes", () => {
    it("formate les durées", () => {
        expect(formatMinutes(45)).toBe("45 min");
        expect(formatMinutes(60)).toBe("1 h");
        expect(formatMinutes(390)).toBe("6 h 30");
        expect(formatMinutesDelta(105)).toBe("+1 h 45");
        expect(formatMinutesDelta(-30)).toBe("−30 min");
        expect(formatMinutesDelta(0)).toBe("stable");
    });
});

describe("formatEuros", () => {
    it("formate les montants", () => {
        expect(formatEuros(124_050)).toBe("1 241 €");
        expect(formatEuros(-42_000)).toBe("−420 €");
        expect(formatEurosShort(85_000)).toBe("850 €");
        expect(formatEurosShort(228_000)).toBe("2,3 k€");
        expect(formatEurosShort(300_000)).toBe("3 k€");
    });
});
