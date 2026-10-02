import {
    flightNature,
    instructionSubType,
    MachineUsage,
    NatureOfTheft,
    PaymentMethod,
    planes,
    Prisma,
    userRole,
    WalletTransactionType,
} from "@prisma/client";
import { dayFr } from "@/config/config";
import { toClubWallClock } from "@/lib/clubTime";
import { computeDurationMinutes } from "@/lib/logbookCalc";
import { isPrivatePlane } from "@/lib/planeVisibility";
import { computeFlightChargeCents, resolveFlightRate } from "@/lib/wallet";

/**
 * Demo club dataset (shared prospect account): pure rules, no DB access.
 *
 * The demo club's sessions, logbook and wallets are wiped and regenerated over a
 * window around today (see src/api/demoClub.ts), so the calendar always looks
 * alive while the row count stays constant. Users, aircraft and club settings
 * are kept; only missing ones are created from the fixtures below.
 */

export const DEMO_WINDOW_DAYS = 15;

const DAY_MS = 24 * 3600 * 1000;
// Fallback rates when the demo club or a training aircraft has none, so flights
// can be signed and debited like in a real club.
export const DEMO_DEFAULT_PLANE_RATE_CENTS = 13_000;
export const DEMO_DEFAULT_INSTRUCTOR_RATE_CENTS = 4_500;

// ─── Refresh gate ───

/** "YYYY-MM-DD" of the club day containing `instant`. */
export function clubDayKey(instant: Date): string {
    return toClubWallClock(instant).toISOString().slice(0, 10);
}

/** Regenerate at most once per club day, and only for a club flagged as demo. */
export function isDemoRefreshDue(
    club: { isDemo: boolean; demoRefreshedAt: Date | null } | null | undefined,
    now: Date
): boolean {
    if (!club?.isDemo) return false;
    if (!club.demoRefreshedAt) return true;
    return clubDayKey(club.demoRefreshedAt) !== clubDayKey(now);
}

// ─── Fixtures (created only when the demo club lacks them) ───

export interface DemoMemberFixture {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: userRole;
    classes: number[];
}

// `.invalid` is a reserved TLD: these addresses can never belong to a real person.
export const DEMO_MEMBER_FIXTURES: DemoMemberFixture[] = [
    { firstName: "Marc", lastName: "Delacroix", email: "marc.delacroix@aeroconnect-demo.invalid", phone: "0601010101", role: userRole.INSTRUCTOR, classes: [3] },
    { firstName: "Claire", lastName: "Beaumont", email: "claire.beaumont@aeroconnect-demo.invalid", phone: "0602020202", role: userRole.INSTRUCTOR, classes: [3] },
    { firstName: "Julien", lastName: "Morel", email: "julien.morel@aeroconnect-demo.invalid", phone: "0603030303", role: userRole.STUDENT, classes: [] },
    { firstName: "Manon", lastName: "Dubois", email: "manon.dubois@aeroconnect-demo.invalid", phone: "0604040404", role: userRole.STUDENT, classes: [] },
    { firstName: "Romain", lastName: "Leroy", email: "romain.leroy@aeroconnect-demo.invalid", phone: "0605050505", role: userRole.STUDENT, classes: [] },
    { firstName: "Isabelle", lastName: "Fontaine", email: "isabelle.fontaine@aeroconnect-demo.invalid", phone: "0606060606", role: userRole.PILOT, classes: [3] },
];

export const DEMO_PLANE_FIXTURES = [
    { name: "Tecnam P92 Echo", immatriculation: "F-JDMA", classes: 3, hobbsTotal: 1120.5, usageTypes: [MachineUsage.INSTRUCTION, MachineUsage.LOCATION], instructionHourlyRateCents: 13_500 },
    { name: "Ventum 912", immatriculation: "F-JDMB", classes: 3, hobbsTotal: 680.3, usageTypes: [MachineUsage.INSTRUCTION, MachineUsage.CLUB], instructionHourlyRateCents: 12_000 },
];

/** Fixtures still missing, by role: a role already represented in the club is left alone. */
export function missingDemoMembers(existingRoles: userRole[], existingEmails: string[]): DemoMemberFixture[] {
    const emails = new Set(existingEmails.map((e) => e.toLowerCase()));
    const roles = new Set(existingRoles);
    return DEMO_MEMBER_FIXTURES.filter((m) => !roles.has(m.role) && !emails.has(m.email));
}

/** Club aircraft a student can train on (club-owned, operational, INSTRUCTION usage). */
export function demoTrainingPlanes<T extends Pick<planes, "ownerID" | "operational" | "usageTypes">>(list: T[]): T[] {
    return list.filter((p) => !isPrivatePlane(p) && p.operational && p.usageTypes.includes(MachineUsage.INSTRUCTION));
}

// ─── Dataset ───

export interface DemoPerson {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
}

export type DemoPlane = Pick<planes, "id" | "name" | "immatriculation" | "classes" | "hobbsTotal" | "ownerID" | "instructionHourlyRateCents">;

export interface DemoDatasetInput {
    clubID: string;
    airfield: string;
    now: Date; // real instant
    daysOn: string[]; // French labels (see dayFr)
    hoursOn: number[];
    instructorHourlyRateCents: number | null;
    instructors: DemoPerson[];
    students: DemoPerson[];
    pilots: DemoPerson[];
    planes: DemoPlane[]; // training aircraft only
    managerID: string | null; // author of manual credits
    seed?: number;
    newId?: () => string;
}

export interface DemoDataset {
    sessions: Prisma.flight_sessionsCreateManyInput[];
    logs: Prisma.flight_logsCreateManyInput[];
    transactions: Prisma.WalletTransactionCreateManyInput[];
    wallets: { userID: string; balanceCents: number }[];
}

function mulberry32(seed: number): () => number {
    let state = seed | 0;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const PILOT_COMMENTS = ["Bonne progression", "Travail sur les atterrissages", "Exercices de panne moteur", "Tours de piste x4", "Approche à stabiliser", null, null];
const STUDENT_COMMENTS = ["Bonne séance", "Un peu de vent de travers", "Super séance !", null, null];
const NAV_DESTINATIONS = ["LFMT", "LFNG", "LFTW", "LFMU"];
const PASSENGERS = [
    { firstName: "Paul", lastName: "Chevalier", email: "paul.chevalier@exemple.fr", phone: "0673040506" },
    { firstName: "Inès", lastName: "Mercier", email: "ines.mercier@exemple.fr", phone: "0672030405" },
];
// Opening credit per payer, cycled: a comfortable balance, an average one, and
// one that stops topping up for the last week and ends overdrawn (shows the
// "blocked" state).
const OPENING_CREDITS_CENTS = [60_000, 30_000, 12_000];
const TOP_UP_CENTS = 20_000;
const TOP_UP_BELOW_CENTS = 5_000;
const LATE_TOP_UP_CENTS = 10_000;
const PAYMENT_METHODS: PaymentMethod[] = [PaymentMethod.TRANSFER, PaymentMethod.CARD, PaymentMethod.CHECK, PaymentMethod.CASH];

type FlightKind = "INSTRUCTION" | "PILOT_DUAL" | "SOLO" | "BAPTEME";

/**
 * Builds the demo club's sessions, logbook and wallet ledger over
 * [today - DEMO_WINDOW_DAYS, today + DEMO_WINDOW_DAYS] (club days):
 *  - past slots are flown and logged (signed, except a few recent ones), and
 *    billable flights are debited at the same rate as a real signature;
 *  - upcoming slots are booked or left open;
 *  - Hobbs readings are replayed backwards so each aircraft's last flight ends
 *    on its current counter (plane.hobbsTotal never moves).
 */
export function buildDemoDataset(input: DemoDatasetInput): DemoDataset {
    const rand = mulberry32(input.seed ?? Number(clubDayKey(input.now).replace(/-/g, "")));
    const randomInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
    const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
    const chance = (p: number) => rand() < p;
    const newId = input.newId ?? (() => crypto.randomUUID());

    const empty: DemoDataset = { sessions: [], logs: [], transactions: [], wallets: [] };
    if (input.instructors.length === 0 || input.planes.length === 0) return empty;

    // Slots are UTC wall-clock (see src/lib/clubTime.ts).
    const nowWall = toClubWallClock(input.now);
    const today = Date.UTC(nowWall.getUTCFullYear(), nowWall.getUTCMonth(), nowWall.getUTCDate());
    // dayFr starts on Monday; getUTCDay() on Sunday.
    const openDays = new Set(input.daysOn.map((d) => (dayFr.indexOf(d) + 1) % 7).filter((d) => d >= 0));
    if (openDays.size === 0) [2, 3, 4, 5, 6, 0].forEach((d) => openDays.add(d));
    const hours = [...new Set(input.hoursOn)].filter((h) => h >= 6 && h <= 20).sort((a, b) => a - b);
    // The last opening hour is closing time: no 1 h slot starts there.
    const slotHours = hours.length > 1 ? hours.slice(0, -1) : hours.length === 1 ? hours : [9, 10, 11, 14, 15, 16];

    const rateOf = (plane: DemoPlane) => resolveFlightRate(plane, { instructorHourlyRateCents: input.instructorHourlyRateCents });

    type Flight = {
        start: Date;
        flownMin: number;
        plane: DemoPlane;
        kind: FlightKind;
        instructor: DemoPerson | null;
        member: DemoPerson | null;
        passenger: (typeof PASSENGERS)[number] | null;
        subType: instructionSubType | null;
        destination: string | null;
        logState: "signed" | "unsigned" | "none";
    };
    const flights: Flight[] = [];

    for (let offset = -DEMO_WINDOW_DAYS; offset <= DEMO_WINDOW_DAYS; offset++) {
        const day = today + offset * DAY_MS;
        const weekday = new Date(day).getUTCDay();
        if (!openDays.has(weekday)) continue;
        const weekend = weekday === 0 || weekday === 6;
        const dayHours = [...slotHours].sort(() => rand() - 0.5).slice(0, weekend ? randomInt(3, 4) : randomInt(2, 3));

        for (const hour of dayHours) {
            const start = new Date(day + hour * 3600 * 1000);
            const isPast = start.getTime() + 3600 * 1000 < nowWall.getTime();
            const roll = rand();
            const kind: FlightKind =
                input.students.length > 0 && roll < 0.65 ? "INSTRUCTION"
                    : input.pilots.length > 0 && roll < 0.75 ? "PILOT_DUAL"
                        : input.pilots.length > 0 && roll < 0.9 ? "SOLO"
                            : "BAPTEME";
            if (kind === "SOLO" && !isPast) continue; // solo flights are only logged after the fact

            const subType: instructionSubType | null =
                kind === "BAPTEME" ? instructionSubType.BAPTEME
                    : kind === "SOLO" ? null
                        : kind === "PILOT_DUAL" ? instructionSubType.LOCAL
                            : pick([instructionSubType.LOCAL, instructionSubType.LOCAL, instructionSubType.LOCAL, instructionSubType.NAVIGATION, instructionSubType.LACHE, instructionSubType.EXAM]);

            const flight: Flight = {
                start,
                flownMin: kind === "BAPTEME" ? pick([15, 20, 30]) : subType === instructionSubType.NAVIGATION ? randomInt(70, 90) : randomInt(40, 60),
                plane: pick(input.planes),
                kind,
                instructor: kind === "SOLO" ? null : pick(input.instructors),
                member: kind === "INSTRUCTION" ? pick(input.students) : kind === "BAPTEME" ? null : pick(input.pilots),
                passenger: kind === "BAPTEME" ? pick(PASSENGERS) : null,
                subType,
                destination: subType === instructionSubType.NAVIGATION || (kind === "SOLO" && chance(0.4)) ? pick(NAV_DESTINATIONS) : null,
                logState: "signed",
            };

            if (!isPast) {
                flight.logState = "none";
                if (kind === "INSTRUCTION" && chance(0.35)) flight.member = null; // open slot
            } else if (offset >= -2) {
                // Most recent flights: some still to log or to sign.
                flight.logState = kind === "SOLO" ? "unsigned" : pick(["none", "unsigned", "signed"] as const);
            }
            // A flight whose debit could not be computed could not be signed either.
            if (flight.logState === "signed" && (kind === "INSTRUCTION" || kind === "PILOT_DUAL") && !rateOf(flight.plane).ok) {
                flight.logState = "unsigned";
            }
            flights.push(flight);
        }
    }

    // ─── Hobbs, replayed per aircraft ───
    const logged = flights.filter((f) => f.logState !== "none").sort((a, b) => a.start.getTime() - b.start.getTime());
    const hobbs = new Map<Flight, { start: number; end: number }>();
    for (const plane of input.planes) {
        const own = logged.filter((f) => f.plane.id === plane.id);
        let cursor = round2((plane.hobbsTotal ?? 500) - own.reduce((s, f) => s + f.flownMin / 60, 0));
        for (const f of own) {
            const end = round2(cursor + f.flownMin / 60);
            hobbs.set(f, { start: cursor, end });
            cursor = end;
        }
    }

    // ─── Rows ───
    const dataset: DemoDataset = { sessions: [], logs: [], transactions: [], wallets: [] };
    const charges: { at: Date; userID: string; log: Prisma.flight_logsCreateManyInput; plane: DemoPlane; minutes: number }[] = [];
    const offeredIDs = input.planes.map((p) => p.id);
    const offeredClasses = [...new Set(input.planes.map((p) => p.classes))];

    for (const f of flights) {
        const nature: NatureOfTheft = f.kind === "BAPTEME" ? NatureOfTheft.DISCOVERY
            : f.kind === "SOLO" ? NatureOfTheft.PRIVATE
                : f.subType === instructionSubType.EXAM ? NatureOfTheft.EXAM
                    : NatureOfTheft.TRAINING;
        const h = hobbs.get(f) ?? null;
        const booked = f.member ?? f.passenger;
        const sessionID = f.instructor ? newId() : null;

        if (sessionID && f.instructor) {
            dataset.sessions.push({
                id: sessionID,
                clubID: input.clubID,
                sessionDateStart: f.start,
                sessionDateDuration_min: 60,
                pilotID: f.instructor.id,
                pilotFirstName: f.instructor.firstName,
                pilotLastName: f.instructor.lastName,
                pilotComment: pick(PILOT_COMMENTS),
                studentID: f.member?.id ?? null,
                studentFirstName: booked?.firstName ?? null,
                studentLastName: booked?.lastName ?? null,
                studentEmail: booked?.email ?? null,
                studentPhone: booked?.phone ?? null,
                studentComment: f.member ? pick(STUDENT_COMMENTS) : null,
                studentPlaneID: booked ? f.plane.id : null,
                student_type: f.member ? "TRAINING" : f.passenger ? "FIRST_FLIGHT" : null,
                planeID: booked ? [f.plane.id] : offeredIDs,
                classes: booked ? [f.plane.classes] : offeredClasses,
                flightType: nature,
                natureOfTheft: [nature],
                startLocation: input.airfield,
                endLocation: input.airfield,
                hobbsStart: h?.start ?? null,
                hobbsEnd: h?.end ?? null,
                landings: 1,
                flightComment: f.kind === "BAPTEME" ? `Baptême ${f.flownMin} min` : null,
            });
        }

        if (!h) continue;
        const signed = f.logState === "signed";
        const end = new Date(f.start.getTime() + f.flownMin * 60 * 1000);
        // Wall-clock -> real instant is never later than now (signature times).
        const signedAt = new Date(Math.min(end.getTime() + 15 * 60 * 1000 - (nowWall.getTime() - input.now.getTime()), input.now.getTime()));
        // Pilot of record: instructor for student / discovery flights, the member
        // for dual control (EP) and solo (P) flights.
        const pilot = f.kind === "INSTRUCTION" || f.kind === "BAPTEME" ? f.instructor! : f.member!;
        const isInstruction = f.kind !== "SOLO";
        const takeoffs = f.subType === instructionSubType.LOCAL ? randomInt(1, 4) : 1;
        const log: Prisma.flight_logsCreateManyInput = {
            id: newId(),
            clubID: input.clubID,
            sessionID,
            date: new Date(Date.UTC(f.start.getUTCFullYear(), f.start.getUTCMonth(), f.start.getUTCDate())),
            planeID: f.plane.id,
            planeRegistration: f.plane.immatriculation,
            planeName: f.plane.name,
            planeClass: f.plane.classes,
            pilotID: pilot.id,
            pilotFirstName: pilot.firstName,
            pilotLastName: pilot.lastName,
            pilotFunction: f.kind === "SOLO" ? "P" : f.kind === "PILOT_DUAL" ? "EP" : "I",
            instructorID: f.kind === "PILOT_DUAL" ? f.instructor!.id : null,
            instructorFirstName: f.kind === "PILOT_DUAL" ? f.instructor!.firstName : null,
            instructorLastName: f.kind === "PILOT_DUAL" ? f.instructor!.lastName : null,
            studentID: f.kind === "INSTRUCTION" ? f.member!.id : null,
            studentFirstName: f.kind === "INSTRUCTION" ? f.member!.firstName : f.passenger?.firstName ?? null,
            studentLastName: f.kind === "INSTRUCTION" ? f.member!.lastName : f.passenger?.lastName ?? null,
            studentEmail: f.kind === "INSTRUCTION" ? f.member!.email : f.passenger?.email ?? null,
            studentPhone: f.kind === "INSTRUCTION" ? f.member!.phone : f.passenger?.phone ?? null,
            flightNature: isInstruction ? flightNature.INSTRUCTION : flightNature.CDB,
            instructionSubType: isInstruction ? f.subType : null,
            takeoffs,
            landings: takeoffs,
            departureAirfield: input.airfield,
            arrivalAirfield: input.airfield,
            hobbsStart: h.start,
            hobbsEnd: h.end,
            fuelAdded: chance(0.3) ? randomInt(15, 35) : null,
            pilotSigned: signed,
            pilotSignedAt: signed ? signedAt : null,
            isManualEntry: !sessionID,
            createdAt: signedAt,
        };
        dataset.logs.push(log);

        if (signed && (f.kind === "INSTRUCTION" || f.kind === "PILOT_DUAL")) {
            charges.push({ at: signedAt, userID: f.member!.id, log, plane: f.plane, minutes: computeDurationMinutes(h.start, h.end) });
        }
    }

    // ─── Wallet ledger, replayed chronologically ───
    const payers = [...input.students, ...input.pilots];
    const balances = new Map<string, number>();
    const move = (userID: string, at: Date, amountCents: number, type: WalletTransactionType, extra: Partial<Prisma.WalletTransactionCreateManyInput> = {}) => {
        const after = (balances.get(userID) ?? 0) + amountCents;
        balances.set(userID, after);
        dataset.transactions.push({ id: newId(), clubID: input.clubID, userID, createdAt: at, type, amountCents, balanceAfterCents: after, ...extra });
    };

    const windowStart = new Date(today - (DEMO_WINDOW_DAYS + 1) * DAY_MS + 10 * 3600 * 1000);
    const latePayers = new Set<string>();
    const lastWeek = today - 7 * DAY_MS;
    payers.forEach((p, i) => {
        const credit = OPENING_CREDITS_CENTS[i % OPENING_CREDITS_CENTS.length];
        if (i % OPENING_CREDITS_CENTS.length === OPENING_CREDITS_CENTS.length - 1) latePayers.add(p.id);
        move(p.id, windowStart, credit, WalletTransactionType.CREDIT, { paymentMethod: PaymentMethod.TRANSFER, authorID: input.managerID, comment: "Provision" });
    });

    for (const c of charges.sort((a, b) => a.at.getTime() - b.at.getTime())) {
        const rate = rateOf(c.plane);
        if (!rate.ok) continue;
        const amount = computeFlightChargeCents(c.minutes, rate.rateCents);
        // A late payer only tops up the bare minimum, and stops for the last week.
        const late = latePayers.has(c.userID);
        const skipsTopUp = late && c.at.getTime() > lastWeek;
        if (!skipsTopUp && (balances.get(c.userID) ?? 0) - amount < (late ? 0 : TOP_UP_BELOW_CENTS)) {
            move(c.userID, new Date(c.at.getTime() - 3600 * 1000), late ? LATE_TOP_UP_CENTS : TOP_UP_CENTS, WalletTransactionType.CREDIT, {
                paymentMethod: pick(PAYMENT_METHODS), authorID: input.managerID,
            });
        }
        move(c.userID, c.at, -amount, WalletTransactionType.DEBIT, {
            flightLogID: c.log.id as string,
            flightDate: c.log.date as Date,
            planeName: c.plane.name,
            planeRegistration: c.plane.immatriculation,
            durationMin: c.minutes,
            rateCents: rate.rateCents,
            rateSource: rate.source,
        });
    }
    if (payers.length > 0 && input.managerID) {
        move(payers[0].id, new Date(today - 6 * DAY_MS + 17 * 3600 * 1000), 2_500, WalletTransactionType.ADJUSTMENT, {
            authorID: input.managerID, comment: "Geste commercial : vol écourté (météo)",
        });
    }

    // Same order as the app reads them; balanceAfterCents follows that order.
    dataset.transactions.sort((a, b) => (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime());
    const running = new Map<string, number>();
    for (const t of dataset.transactions) {
        const after = (running.get(t.userID) ?? 0) + t.amountCents;
        running.set(t.userID, after);
        t.balanceAfterCents = after;
    }
    dataset.wallets = [...running.entries()].map(([userID, balanceCents]) => ({ userID, balanceCents }));
    return dataset;
}
