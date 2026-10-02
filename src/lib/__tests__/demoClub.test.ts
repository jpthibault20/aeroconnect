import { describe, it, expect } from "vitest";
import { MachineUsage, userRole } from "@prisma/client";
import {
    buildDemoDataset,
    clubDayKey,
    DEMO_MEMBER_FIXTURES,
    DEMO_WINDOW_DAYS,
    DemoDatasetInput,
    demoTrainingPlanes,
    isDemoRefreshDue,
    missingDemoMembers,
} from "@/lib/demoClub";
import { computeDurationMinutes } from "@/lib/logbookCalc";
import { computeFlightChargeCents } from "@/lib/wallet";

const DAY_MS = 24 * 3600 * 1000;
const person = (id: string) => ({ id, firstName: id, lastName: "Demo", email: `${id}@x.invalid`, phone: null });

function baseInput(overrides: Partial<DemoDatasetInput> = {}): DemoDatasetInput {
    let n = 0;
    return {
        clubID: "LFdemo",
        airfield: "LFDM",
        now: new Date("2026-10-02T12:00:00Z"), // 14:00 in Paris
        daysOn: ["Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
        hoursOn: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
        instructorHourlyRateCents: 4_500,
        instructors: [person("instr1"), person("instr2")],
        students: [person("stu1"), person("stu2"), person("stu3")],
        pilots: [person("pil1")],
        planes: [
            { id: "planeA", name: "Tecnam", immatriculation: "F-JAAA", classes: 3, hobbsTotal: 1000, ownerID: null, instructionHourlyRateCents: 13_500 },
            { id: "planeB", name: "Ventum", immatriculation: "F-JBBB", classes: 3, hobbsTotal: 500, ownerID: null, instructionHourlyRateCents: 12_000 },
        ],
        managerID: "owner",
        seed: 42,
        newId: () => `id-${++n}`,
        ...overrides,
    };
}

describe("isDemoRefreshDue", () => {
    const now = new Date("2026-10-02T12:00:00Z");

    it("never refreshes a real club", () => {
        expect(isDemoRefreshDue({ isDemo: false, demoRefreshedAt: null }, now)).toBe(false);
        expect(isDemoRefreshDue(null, now)).toBe(false);
    });

    it("refreshes a demo club never refreshed, or refreshed on an earlier club day", () => {
        expect(isDemoRefreshDue({ isDemo: true, demoRefreshedAt: null }, now)).toBe(true);
        expect(isDemoRefreshDue({ isDemo: true, demoRefreshedAt: new Date("2026-10-01T20:00:00Z") }, now)).toBe(true);
    });

    it("does not refresh twice the same club day", () => {
        expect(isDemoRefreshDue({ isDemo: true, demoRefreshedAt: new Date("2026-10-02T06:00:00Z") }, now)).toBe(false);
    });

    it("uses the club time zone: 22:30 UTC on Oct 1 is already Oct 2 in Paris", () => {
        expect(clubDayKey(new Date("2026-10-01T22:30:00Z"))).toBe("2026-10-02");
        expect(isDemoRefreshDue({ isDemo: true, demoRefreshedAt: new Date("2026-10-01T22:30:00Z") }, now)).toBe(false);
    });
});

describe("missingDemoMembers / demoTrainingPlanes", () => {
    it("only adds roles the club lacks", () => {
        const missing = missingDemoMembers([userRole.INSTRUCTOR, userRole.OWNER], []);
        expect(missing.every((m) => m.role !== userRole.INSTRUCTOR)).toBe(true);
        expect(missing.some((m) => m.role === userRole.STUDENT)).toBe(true);
        expect(missingDemoMembers(DEMO_MEMBER_FIXTURES.map((m) => m.role), [])).toEqual([]);
    });

    it("keeps operational club aircraft used for instruction only", () => {
        const list = [
            { id: "a", ownerID: null, operational: true, usageTypes: [MachineUsage.INSTRUCTION] },
            { id: "b", ownerID: "u1", operational: true, usageTypes: [] },
            { id: "c", ownerID: null, operational: false, usageTypes: [MachineUsage.INSTRUCTION] },
            { id: "d", ownerID: null, operational: true, usageTypes: [MachineUsage.LOCATION] },
        ];
        expect(demoTrainingPlanes(list).map((p) => p.id)).toEqual(["a"]);
    });
});

describe("buildDemoDataset", () => {
    const input = baseInput();
    const data = buildDemoDataset(input);
    const nowWall = new Date("2026-10-02T14:00:00Z");

    it("stays within today ± DEMO_WINDOW_DAYS", () => {
        const min = Date.UTC(2026, 9, 2) - DEMO_WINDOW_DAYS * DAY_MS;
        const max = Date.UTC(2026, 9, 2) + (DEMO_WINDOW_DAYS + 1) * DAY_MS;
        for (const s of data.sessions) {
            const t = (s.sessionDateStart as Date).getTime();
            expect(t).toBeGreaterThanOrEqual(min);
            expect(t).toBeLessThan(max);
        }
        expect(data.sessions.some((s) => (s.sessionDateStart as Date) > nowWall)).toBe(true);
        expect(data.sessions.some((s) => (s.sessionDateStart as Date) < nowWall)).toBe(true);
    });

    it("only schedules on open days and opening hours", () => {
        for (const s of data.sessions) {
            const start = s.sessionDateStart as Date;
            expect(start.getUTCDay()).not.toBe(1); // Monday closed
            expect(start.getUTCHours()).toBeGreaterThanOrEqual(8);
            expect(start.getUTCHours()).toBeLessThanOrEqual(17);
        }
    });

    it("never logs an upcoming flight and leaves some upcoming slots open", () => {
        const sessionsByID = new Map(data.sessions.map((s) => [s.id, s]));
        for (const log of data.logs) {
            if (!log.sessionID) continue;
            expect((sessionsByID.get(log.sessionID)!.sessionDateStart as Date) < nowWall).toBe(true);
        }
        expect(data.sessions.some((s) => (s.sessionDateStart as Date) > nowWall && s.studentID == null && s.studentFirstName == null)).toBe(true);
    });

    it("ends each aircraft's Hobbs readings on its current counter, without gaps", () => {
        for (const plane of input.planes) {
            const logs = data.logs.filter((l) => l.planeID === plane.id).sort((a, b) => (a.hobbsStart as number) - (b.hobbsStart as number));
            expect(logs.length).toBeGreaterThan(0);
            expect(logs.at(-1)!.hobbsEnd).toBeCloseTo(plane.hobbsTotal as number, 2);
            for (let i = 1; i < logs.length; i++) expect(logs[i].hobbsStart).toBeCloseTo(logs[i - 1].hobbsEnd as number, 2);
        }
    });

    it("debits each signed billable flight exactly like a real signature", () => {
        const debits = data.transactions.filter((t) => t.type === "DEBIT");
        const billable = data.logs.filter((l) => l.pilotSigned && l.flightNature === "INSTRUCTION" && l.instructionSubType !== "BAPTEME");
        expect(debits).toHaveLength(billable.length);
        for (const d of debits) {
            const log = data.logs.find((l) => l.id === d.flightLogID)!;
            const plane = input.planes.find((p) => p.id === log.planeID)!;
            const minutes = computeDurationMinutes(log.hobbsStart, log.hobbsEnd);
            expect(d.amountCents).toBe(-computeFlightChargeCents(minutes, plane.instructionHourlyRateCents!));
            expect(d.userID).toBe(log.studentID ?? log.pilotID);
        }
    });

    it("keeps every wallet consistent with its ledger, with at least one overdrawn member", () => {
        for (const w of data.wallets) {
            const txs = data.transactions.filter((t) => t.userID === w.userID);
            expect(txs.reduce((s, t) => s + t.amountCents, 0)).toBe(w.balanceCents);
            expect(txs.at(-1)!.balanceAfterCents).toBe(w.balanceCents);
        }
        expect(data.wallets.some((w) => w.balanceCents < 0)).toBe(true);
        expect(data.wallets.some((w) => w.balanceCents > 0)).toBe(true);
    });

    it("never dates a signature or a transaction in the future", () => {
        for (const l of data.logs) if (l.pilotSignedAt) expect((l.pilotSignedAt as Date) <= input.now).toBe(true);
        for (const t of data.transactions) expect((t.createdAt as Date) <= input.now).toBe(true);
    });

    it("produces a bounded dataset, whatever the date", () => {
        expect(data.sessions.length).toBeLessThan(31 * 4);
        expect(data.logs.length).toBeLessThan(16 * 4);
    });

    it("leaves flights unsigned (and undebited) on an aircraft without a rate", () => {
        const unpriced = buildDemoDataset(baseInput({
            planes: [{ id: "planeX", name: "X", immatriculation: "F-JXXX", classes: 3, hobbsTotal: 100, ownerID: null, instructionHourlyRateCents: null }],
        }));
        expect(unpriced.transactions.filter((t) => t.type === "DEBIT")).toHaveLength(0);
        expect(unpriced.logs.filter((l) => l.pilotSigned && l.flightNature === "INSTRUCTION" && l.instructionSubType !== "BAPTEME")).toHaveLength(0);
    });

    it("returns nothing without instructors or aircraft", () => {
        expect(buildDemoDataset(baseInput({ instructors: [] })).sessions).toHaveLength(0);
        expect(buildDemoDataset(baseInput({ planes: [] })).logs).toHaveLength(0);
    });
});
