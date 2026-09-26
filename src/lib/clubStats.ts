import { flightNature, pilotFunction, WalletTransactionType } from "@prisma/client";
import { computeDurationMinutes } from "./logbookCalc";
import { toClubWallClock } from "./clubTime";

/**
 * "Club" page statistics (AER-68): pure, tested helpers.
 *
 * Every date handled here is a club DAY, represented as a `Date` at UTC midnight
 * (same convention as `flight_logs.date`, a @db.Date column). A real instant
 * (e.g. `WalletTransaction.createdAt`) is mapped to its club day via `clubDay`.
 *
 * The server actions (src/api/db/stats.ts) only load the rows and call these
 * functions: all period and aggregation logic lives here.
 */

// ─── Periods ───

export type StatsPeriod = "month" | "year" | "rolling12";

export const STATS_PERIODS: { id: StatsPeriod; label: string }[] = [
    { id: "month", label: "Ce mois" },
    { id: "year", label: "Cette année" },
    { id: "rolling12", label: "12 mois" },
];

export function isStatsPeriod(value: unknown): value is StatsPeriod {
    return value === "month" || value === "year" || value === "rolling12";
}

export interface DayRange {
    from: Date; // inclusive
    to: Date; // inclusive
}

export interface StatsBucket extends DayRange {
    label: string;
}

export interface PeriodWindow {
    period: StatsPeriod;
    // Current period, up to and including today.
    current: DayRange;
    // Previous period "to date": same elapsed duration, so the key figures compare
    // fairly (September 10 compares with August 1–10, not the whole of August).
    previous: DayRange;
    // Chart buckets: current period (future buckets stay at 0) and the full previous
    // period, bucket by bucket.
    buckets: StatsBucket[];
    previousBuckets: StatsBucket[];
    bucketUnit: "week" | "month";
    currentLabel: string;
    previousLabel: string;
    // Short label for changes: "vs août", "vs 2025"…
    comparisonLabel: string;
}

export const MONTH_SHORT = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
const MONTH_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Club day (UTC midnight) from year / month / day; month and day may overflow. */
export function utcDay(year: number, month: number, day: number): Date {
    return new Date(Date.UTC(year, month, day));
}

function daysInMonth(year: number, month: number): number {
    return utcDay(year, month + 1, 0).getUTCDate();
}

/**
 * Same day of the month, clamped to the target month's last day (March 31 ->
 * February 28/29).
 */
function sameDayInMonth(year: number, month: number, day: number): Date {
    const first = utcDay(year, month, 1);
    return utcDay(first.getUTCFullYear(), first.getUTCMonth(), Math.min(day, daysInMonth(first.getUTCFullYear(), first.getUTCMonth())));
}

/** Club day of a real instant. */
export function clubDay(instant: Date): Date {
    const wall = toClubWallClock(instant);
    return utcDay(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate());
}

/** Monthly buckets: `count` months ending with month (year, month). */
export function monthBuckets(year: number, month: number, count: number): StatsBucket[] {
    return Array.from({ length: count }, (_, i) => {
        const from = utcDay(year, month - (count - 1) + i, 1);
        const y = from.getUTCFullYear();
        const m = from.getUTCMonth();
        return { label: MONTH_SHORT[m], from, to: utcDay(y, m, daysInMonth(y, m)) };
    });
}

/** Weeks of the month: 1–7, 8–14, 15–21, 22–28, 29–end. */
function weekBuckets(year: number, month: number): StatsBucket[] {
    const last = daysInMonth(year, month);
    const buckets: StatsBucket[] = [];
    for (let start = 1, i = 1; start <= last; start += 7, i++) {
        buckets.push({ label: `S${i}`, from: utcDay(year, month, start), to: utcDay(year, month, Math.min(start + 6, last)) });
    }
    return buckets;
}

/**
 * Window of a period, from the club day `today` (see clubDay).
 */
export function resolvePeriodWindow(period: StatsPeriod, today: Date): PeriodWindow {
    const y = today.getUTCFullYear();
    const m = today.getUTCMonth();
    const d = today.getUTCDate();

    if (period === "month") {
        const prev = utcDay(y, m - 1, 1);
        const py = prev.getUTCFullYear();
        const pm = prev.getUTCMonth();
        return {
            period,
            current: { from: utcDay(y, m, 1), to: today },
            previous: { from: prev, to: sameDayInMonth(py, pm, d) },
            buckets: weekBuckets(y, m),
            previousBuckets: weekBuckets(py, pm),
            bucketUnit: "week",
            currentLabel: `${MONTH_LONG[m]} ${y}`,
            previousLabel: `${MONTH_LONG[pm]} ${py}`,
            comparisonLabel: `vs ${MONTH_LONG[pm]}`,
        };
    }

    if (period === "year") {
        return {
            period,
            current: { from: utcDay(y, 0, 1), to: today },
            previous: { from: utcDay(y - 1, 0, 1), to: sameDayInMonth(y - 1, m, d) },
            buckets: monthBuckets(y, m, m + 1),
            previousBuckets: monthBuckets(y - 1, m, m + 1),
            bucketUnit: "month",
            currentLabel: String(y),
            previousLabel: String(y - 1),
            comparisonLabel: `vs ${y - 1}`,
        };
    }

    // Rolling 12 months: the current month and the 11 previous ones.
    return {
        period,
        current: { from: utcDay(y, m - 11, 1), to: today },
        previous: { from: utcDay(y, m - 23, 1), to: sameDayInMonth(y - 1, m, d) },
        buckets: monthBuckets(y, m, 12),
        previousBuckets: monthBuckets(y - 1, m, 12),
        bucketUnit: "month",
        currentLabel: "12 derniers mois",
        previousLabel: "12 mois précédents",
        comparisonLabel: "vs an. préc.",
    };
}

/** Smallest and largest day covered by the window (query bounds). */
export function windowBounds(w: PeriodWindow): DayRange {
    const days = [w.current, w.previous, ...w.buckets, ...w.previousBuckets];
    return {
        from: new Date(Math.min(...days.map((r) => r.from.getTime()))),
        to: new Date(Math.max(...days.map((r) => r.to.getTime()))),
    };
}

/**
 * Real-instant bounds to query a timestamptz column: widened by one day on each
 * side (time zone offset), fine filtering then happens via `clubDay`.
 */
export function instantBounds(range: DayRange): { gte: Date; lt: Date } {
    return { gte: new Date(range.from.getTime() - DAY_MS), lt: new Date(range.to.getTime() + 2 * DAY_MS) };
}

export function inRange(day: Date, range: DayRange): boolean {
    const t = day.getTime();
    return t >= range.from.getTime() && t <= range.to.getTime();
}

// ─── Generic aggregations ───

export function sumInRange<T>(items: T[], range: DayRange, day: (t: T) => Date, value: (t: T) => number): number {
    let total = 0;
    for (const item of items) if (inRange(day(item), range)) total += value(item);
    return total;
}

export function sumByBucket<T>(items: T[], buckets: DayRange[], day: (t: T) => Date, value: (t: T) => number): number[] {
    return buckets.map((b) => sumInRange(items, b, day, value));
}

export interface RankRow {
    key: string;
    label: string;
    sub: string | null;
    value: number; // minutes or cents depending on the ranking
    count: number; // number of flights / operations
}

/** Descending ranking by value (zero rows excluded), ties broken alphabetically. */
export function rankBy<T>(
    items: T[],
    key: (t: T) => string | null,
    label: (t: T) => string,
    sub: (t: T) => string | null,
    value: (t: T) => number
): RankRow[] {
    const rows = new Map<string, RankRow>();
    for (const item of items) {
        const k = key(item);
        if (k == null) continue;
        const row = rows.get(k) ?? { key: k, label: label(item), sub: sub(item), value: 0, count: 0 };
        row.value += value(item);
        row.count += 1;
        rows.set(k, row);
    }
    return Array.from(rows.values())
        .filter((r) => r.value !== 0)
        .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

/** Relative change in % (rounded); null if the previous period is empty. */
export function percentChange(current: number, previous: number): number | null {
    if (previous === 0) return null;
    return Math.round(((current - previous) / previous) * 100);
}

// ─── Logbook ───

/** flight_logs fields used by the statistics. */
export interface FlightLogStatInput {
    date: Date;
    hobbsStart: number | null;
    hobbsEnd: number | null;
    planeName: string;
    planeRegistration: string;
    flightNature: flightNature;
    pilotID: string;
    pilotFirstName: string;
    pilotLastName: string;
    pilotFunction: pilotFunction;
    instructorID: string | null;
    instructorFirstName: string | null;
    instructorLastName: string | null;
    studentID: string | null;
    studentFirstName: string | null;
    studentLastName: string | null;
}

export interface StatLog {
    date: Date;
    minutes: number;
    plane: string;
    planeRegistration: string;
    instructorID: string | null;
    instructorName: string | null;
    studentID: string | null;
    studentName: string | null;
}

const shortName = (first: string | null, last: string | null) =>
    `${(last ?? "").toUpperCase()} ${first ? first.charAt(0).toUpperCase() + "." : ""}`.trim();

/**
 * Normalizes a logbook row. An instruction flight is ONE row: the recorded pilot
 * is the instructor (function I) or the student (function EP); the instructor* /
 * student* fields fill in the other party.
 */
export function toStatLog(log: FlightLogStatInput): StatLog {
    const isInstruction = log.flightNature === flightNature.INSTRUCTION;
    const instructorID = isInstruction ? log.instructorID ?? (log.pilotFunction === "I" ? log.pilotID : null) : null;
    const instructorName = !instructorID
        ? null
        : log.instructorID
            ? shortName(log.instructorFirstName, log.instructorLastName)
            : shortName(log.pilotFirstName, log.pilotLastName);
    const studentID = isInstruction ? log.studentID ?? (log.pilotFunction === "EP" ? log.pilotID : null) : null;
    const studentName = !studentID
        ? null
        : log.studentID
            ? shortName(log.studentFirstName, log.studentLastName)
            : shortName(log.pilotFirstName, log.pilotLastName);
    return {
        date: log.date,
        minutes: computeDurationMinutes(log.hobbsStart, log.hobbsEnd),
        plane: log.planeName,
        planeRegistration: log.planeRegistration,
        instructorID,
        instructorName,
        studentID,
        studentName,
    };
}

export interface SeriesPoint {
    label: string;
    current: number;
    previous: number;
}

export interface FlightStats {
    period: StatsPeriod;
    currentLabel: string;
    previousLabel: string;
    comparisonLabel: string;
    bucketUnit: "week" | "month";
    minutes: number;
    previousMinutes: number;
    flights: number;
    previousFlights: number;
    students: number; // distinct students who flew in instruction
    previousStudents: number;
    series: SeriesPoint[]; // minutes per bucket
    byPlane: RankRow[];
    byInstructor: RankRow[];
    byStudent: RankRow[];
}

const countDistinct = (logs: StatLog[], range: DayRange) =>
    new Set(logs.filter((l) => l.studentID && inRange(l.date, range)).map((l) => l.studentID)).size;

export function computeFlightStats(logs: StatLog[], w: PeriodWindow): FlightStats {
    const current = logs.filter((l) => inRange(l.date, w.current));
    const previous = logs.filter((l) => inRange(l.date, w.previous));
    const minutes = (l: StatLog) => l.minutes;
    const day = (l: StatLog) => l.date;
    const currentSeries = sumByBucket(logs, w.buckets, day, minutes);
    const previousSeries = sumByBucket(logs, w.previousBuckets, day, minutes);

    return {
        period: w.period,
        currentLabel: w.currentLabel,
        previousLabel: w.previousLabel,
        comparisonLabel: w.comparisonLabel,
        bucketUnit: w.bucketUnit,
        minutes: current.reduce((s, l) => s + l.minutes, 0),
        previousMinutes: previous.reduce((s, l) => s + l.minutes, 0),
        flights: current.length,
        previousFlights: previous.length,
        students: countDistinct(logs, w.current),
        previousStudents: countDistinct(logs, w.previous),
        series: w.buckets.map((b, i) => ({ label: b.label, current: currentSeries[i], previous: previousSeries[i] ?? 0 })),
        byPlane: rankBy(current, (l) => l.planeRegistration, (l) => l.plane, (l) => l.planeRegistration, minutes),
        byInstructor: rankBy(current, (l) => l.instructorID, (l) => l.instructorName ?? "", () => null, minutes),
        byStudent: rankBy(current, (l) => l.studentID, (l) => l.studentName ?? "", () => null, minutes),
    };
}

// ─── Wallets ───

export type WalletMode = "cashed" | "billed";

export interface StatTransaction {
    day: Date; // club day (see clubDay)
    type: WalletTransactionType;
    amountCents: number;
    flightLogID: string | null;
    userID: string;
    planeName: string | null;
    planeRegistration: string | null;
}

/**
 * Cashed: payments received (credits). Billed: net amount of flights (signing
 * debits and automatic corrections tied to a flight), counted as positive.
 * Manual withdrawals / corrections are neither.
 */
export function transactionAmount(t: StatTransaction, mode: WalletMode): number {
    if (mode === "cashed") return t.type === WalletTransactionType.CREDIT ? t.amountCents : 0;
    return t.flightLogID && t.type !== WalletTransactionType.CREDIT ? -t.amountCents : 0;
}

export interface WalletModeStats {
    total: number;
    previousTotal: number;
    count: number; // payments (cashed) or debited flights (billed)
    series: SeriesPoint[];
    byMember: RankRow[];
    byPlane: RankRow[]; // empty in cashed mode: a payment is not tied to any plane
}

export interface WalletStats {
    period: StatsPeriod;
    currentLabel: string;
    comparisonLabel: string;
    bucketUnit: "week" | "month";
    cashed: WalletModeStats;
    billed: WalletModeStats;
}

function computeMode(txs: StatTransaction[], w: PeriodWindow, mode: WalletMode, memberName: (id: string) => string): WalletModeStats {
    const amount = (t: StatTransaction) => transactionAmount(t, mode);
    const day = (t: StatTransaction) => t.day;
    const current = txs.filter((t) => inRange(t.day, w.current) && amount(t) !== 0);
    const currentSeries = sumByBucket(txs, w.buckets, day, amount);
    const previousSeries = sumByBucket(txs, w.previousBuckets, day, amount);
    return {
        total: sumInRange(txs, w.current, day, amount),
        previousTotal: sumInRange(txs, w.previous, day, amount),
        count: mode === "cashed" ? current.length : current.filter((t) => t.type === WalletTransactionType.DEBIT).length,
        series: w.buckets.map((b, i) => ({ label: b.label, current: currentSeries[i], previous: previousSeries[i] ?? 0 })),
        byMember: rankBy(current, (t) => t.userID, (t) => memberName(t.userID), () => null, amount),
        byPlane: mode === "billed"
            ? rankBy(current, (t) => t.planeRegistration, (t) => t.planeName ?? t.planeRegistration ?? "", (t) => t.planeRegistration, amount)
            : [],
    };
}

export function computeWalletStats(txs: StatTransaction[], w: PeriodWindow, memberName: (id: string) => string): WalletStats {
    return {
        period: w.period,
        currentLabel: w.currentLabel,
        comparisonLabel: w.comparisonLabel,
        bucketUnit: w.bucketUnit,
        cashed: computeMode(txs, w, "cashed", memberName),
        billed: computeMode(txs, w, "billed", memberName),
    };
}

// ─── Management overview: activity of the last months ───

export interface ActivityPoint {
    label: string;
    minutes: number;
    cashedCents: number;
}

export function computeActivity(logs: StatLog[], txs: StatTransaction[], buckets: StatsBucket[]): ActivityPoint[] {
    const minutes = sumByBucket(logs, buckets, (l) => l.date, (l) => l.minutes);
    const cashed = sumByBucket(txs, buckets, (t) => t.day, (t) => transactionAmount(t, "cashed"));
    return buckets.map((b, i) => ({ label: b.label, minutes: minutes[i], cashedCents: cashed[i] }));
}

// ─── Display formats ───

/** 390 -> "6 h 30", 60 -> "1 h", 45 -> "45 min". */
export function formatMinutes(minutes: number): string {
    const safe = Math.max(0, Math.round(minutes));
    const h = Math.floor(safe / 60);
    const m = safe % 60;
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

/** Signed duration delta: "+1 h 45", "−30 min", "stable" if zero. */
export function formatMinutesDelta(delta: number): string {
    if (Math.round(delta) === 0) return "stable";
    return `${delta > 0 ? "+" : "−"}${formatMinutes(Math.abs(delta))}`;
}

const euroNoDecimals = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/** Amount rounded to the euro: 124050 -> "1 241 €". */
export function formatEuros(cents: number): string {
    const formatted = euroNoDecimals.format(Math.abs(cents) / 100).replace(/[  ]/g, " ");
    return cents < 0 ? `−${formatted}` : formatted;
}

/** Compact amount for axes and labels: "850 €", "2,3 k€". */
export function formatEurosShort(cents: number): string {
    const euros = cents / 100;
    if (Math.abs(euros) < 1000) return `${Math.round(euros)} €`;
    return `${(euros / 1000).toFixed(1).replace(".", ",").replace(",0", "")} k€`;
}
