import { flightNature, instructionSubType, pilotFunction, userRole } from "@prisma/client";

const INSTRUCTOR_ROLES: userRole[] = [
    userRole.INSTRUCTOR,
    userRole.OWNER,
    userRole.ADMIN,
];

export function isInstructorRole(role: userRole): boolean {
    return INSTRUCTOR_ROLES.includes(role);
}

// pilotFunction is derived from the flight type + the role of the user creating
// the entry. No direct UI input anymore.
export function derivePilotFunction(
    nature: flightNature,
    userRoleValue: userRole
): pilotFunction {
    if (nature === "CDB") return "P";
    return isInstructorRole(userRoleValue) ? "I" : "EP";
}

// ─── Hobbs counter input format ───
// All Hobbs values are STORED as decimal hours (123.5 = 123 h 30 min): the single
// source of truth for computeDurationMinutes and plane.hobbsTotal. The format
// below ONLY affects input/display in the popups: some counters show decimals,
// others HH:MM (123,30 = 123 h 30 min). Conversion to the canonical decimal
// happens on input (see HobbsInput) so nothing else in the app changes.
export type HobbsFormat = "HMS" | "DECIMAL";

// Splits decimal hours into whole hours + minutes (0-59).
// 123.5 -> { hours: 123, minutes: 30 }
export function decimalToHoursMinutes(value: number): { hours: number; minutes: number } {
    const totalMinutes = Math.round(value * 60);
    return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

// Rebuilds hours + minutes into canonical decimal hours (stored value).
// (123, 30) -> 123.5. Rounded to 4 decimals to keep clean numbers
// (1/60 = 0.0166… is non-terminating) while keeping minute resolution.
export function hoursMinutesToDecimal(hours: number, minutes: number): number {
    return Math.round((hours + minutes / 60) * 1e4) / 1e4;
}

export interface HobbsParseResult {
    // Canonical decimal hours, or null if empty / invalid.
    decimal: number | null;
    // true only in HH:MM when the minutes part is >= 60.
    minutesInvalid: boolean;
}

// Parses an HH:MM input. Free separator: ",", "." or ":" (dot and comma are on
// the mobile numeric keypad). Digits after the separator are MINUTES (0-59), not
// a decimal fraction.
//   "123"     -> 123 h 00
//   "123,30"  -> 123 h 30   (same for "123.30" / "123:30")
//   "123,5"   -> 123 h 05
//   "123,75"  -> invalid minutes
function parseHmsInput(raw: string): HobbsParseResult {
    const s = raw.trim();
    if (s === "") return { decimal: null, minutesInvalid: false };

    const withSep = s.match(/^(\d+)\s*[.,:]\s*(\d*)$/);
    if (withSep) {
        const hours = parseInt(withSep[1], 10);
        const minStr = withSep[2];
        const minutes = minStr === "" ? 0 : parseInt(minStr, 10);
        if (minutes > 59) return { decimal: null, minutesInvalid: true };
        return { decimal: hoursMinutesToDecimal(hours, minutes), minutesInvalid: false };
    }

    const onlyHours = s.match(/^\d+$/);
    if (onlyHours) {
        return { decimal: hoursMinutesToDecimal(parseInt(s, 10), 0), minutesInvalid: false };
    }

    return { decimal: null, minutesInvalid: false };
}

function parseDecimalInput(raw: string): HobbsParseResult {
    const s = raw.trim().replace(",", ".");
    if (s === "") return { decimal: null, minutesInvalid: false };
    const v = parseFloat(s);
    return { decimal: isNaN(v) ? null : v, minutesInvalid: false };
}

// Parses a user input (popups) into canonical decimal hours.
export function parseHobbsInput(raw: string, format: HobbsFormat): HobbsParseResult {
    return format === "HMS" ? parseHmsInput(raw) : parseDecimalInput(raw);
}

// Canonical decimal hours -> string shown in the field for the given format.
export function formatHobbsValue(value: number | null, format: HobbsFormat): string {
    if (value == null) return "";
    if (format === "DECIMAL") return String(value);
    const { hours, minutes } = decimalToHoursMinutes(value);
    return `${hours}:${String(minutes).padStart(2, "0")}`;
}

// Duration in minutes: computed on the fly from the Hobbs hours. Not stored in
// the DB to keep a single source of truth (Hobbs).
export function computeDurationMinutes(
    hobbsStart: number | null | undefined,
    hobbsEnd: number | null | undefined
): number {
    if (hobbsStart == null || hobbsEnd == null) return 0;
    const diff = hobbsEnd - hobbsStart;
    if (diff <= 0) return 0;
    return Math.round(diff * 60);
}

// ─── Plane Hobbs counter (plane.hobbsTotal) ───
// Invariant: the counter NEVER goes backwards as a side effect of an entry.
// Each logbook entry is a reading of the physical counter by the pilot: its
// hobbsStart is frozen at creation (= current counter), and its end advances the
// counter on creation, signed or not, so the next pilot sees an up-to-date start.
// Signing only locks the entry.
// 
// Signing/creating an earlier flight AFTER a later one (end lower than the
// counter) must therefore not move the counter back: exactly the bug that
// corrupted the starts of every following flight.

// Equality of two counter readings (values rounded to 4 decimals, see
// hoursMinutesToDecimal) with a sub-minute tolerance.
function sameHobbs(a: number, b: number): boolean {
    return Math.abs(a - b) < 1e-6;
}

// New counter after creating or editing an entry.
//   current     : current plane.hobbsTotal (null = unknown counter)
//   previousEnd : stored hobbsEnd of the entry BEFORE the edit (null on creation)
//   nextEnd     : hobbsEnd after the edit (null = unchanged / not entered)
// If the entry was the "head" (its previous end IS the current counter), its new
// end replaces the counter: the only case where it can go down, as an explicit
// correction of the last reading (typo). Otherwise: max(current, end), never
// backwards.
export function advanceHobbsTotal(
    current: number | null | undefined,
    previousEnd: number | null | undefined,
    nextEnd: number | null | undefined
): number | null {
    if (nextEnd == null) return current ?? null;
    if (current == null) return nextEnd;
    if (previousEnd != null && sameHobbs(previousEnd, current)) return nextEnd;
    return Math.max(current, nextEnd);
}

// Counter after deleting an (unsigned) entry. If it was the head, go back to its
// start (last known reading before this flight); otherwise another flight has
// already pushed the counter further and it is left alone.
export function rollbackHobbsTotal(
    current: number | null | undefined,
    log: { hobbsStart: number | null; hobbsEnd: number | null }
): number | null {
    if (current == null || log.hobbsEnd == null) return current ?? null;
    if (!sameHobbs(log.hobbsEnd, current)) return current;
    return log.hobbsStart ?? current;
}

// ─── Server-side hobbsStart resolution rules ───
// Extracted from the createFlightLog / updateFlightLog / signFlightLog server
// actions so they can be tested without a DB.

export const HOBBS_END_BEFORE_START_ERROR =
    "Les heures moteur de fin doivent être supérieures à celles de début";
export const HOBBS_START_UNRESOLVED_ERROR =
    "Impossible de déterminer l'heure moteur de début : le compteur de l'aéronef est déjà au-delà de la fin saisie. Un président ou un administrateur doit renseigner l'heure de début.";

export type HobbsRuleResult<T> = ({ ok: true } & T) | { ok: false; error: string };

// end > start, only when both are known.
export function validateHobbsRange(
    hobbsStart: number | null | undefined,
    hobbsEnd: number | null | undefined
): HobbsRuleResult<object> {
    if (hobbsEnd != null && hobbsStart != null && hobbsEnd <= hobbsStart) {
        return { ok: false, error: HOBBS_END_BEFORE_START_ERROR };
    }
    return { ok: true };
}

// Creation: the start is the plane's current counter, period. The value sent by
// the client is only used:
//  - by an OWNER/ADMIN (override, an accepted bad practice: fixing an entry or an
//    earlier flight entered late);
//  - when the counter is unknown (plane never logged): the first entry
//    initializes it with the value read on the aircraft, whatever the role.
export function resolveCreateHobbsStart(args: {
    planeHobbsTotal: number | null;
    requested: number | undefined;
    canOverride: boolean;
}): number | null {
    if (args.requested !== undefined && (args.canOverride || args.planeHobbsTotal == null)) {
        return args.requested;
    }
    return args.planeHobbsTotal;
}

// Update: only an OWNER/ADMIN can change the start; for other roles the value
// sent is silently ignored (the client is supposed to lock the field) and
// validation runs against the stored start.
// startOverride: value to write to the DB (undefined = leave untouched).
export function resolveUpdateHobbs(args: {
    existing: { hobbsStart: number | null; hobbsEnd: number | null };
    requestedStart: number | undefined;
    requestedEnd: number | undefined;
    canOverride: boolean;
}): HobbsRuleResult<{ hobbsStart: number | null; hobbsEnd: number | null; startOverride: number | undefined }> {
    const startOverride = args.canOverride ? args.requestedStart : undefined;
    const hobbsStart = startOverride !== undefined ? startOverride : args.existing.hobbsStart;
    const hobbsEnd = args.requestedEnd !== undefined ? args.requestedEnd : args.existing.hobbsEnd;
    const range = validateHobbsRange(hobbsStart, hobbsEnd);
    if (!range.ok) return range;
    return { ok: true, hobbsStart, hobbsEnd, startOverride };
}

// Signing: the start was normally frozen at creation. What remains is historical
// entries (auto-created, null start): freeze it to the current counter if still
// consistent (counter < end), otherwise the counter has already passed this
// flight and only an OWNER/ADMIN can set the start manually.
export function resolveSignHobbsStart(args: {
    logStart: number | null;
    logEnd: number | null;
    planeHobbsTotal: number | null;
}): HobbsRuleResult<{ hobbsStart: number | null }> {
    if (args.logStart != null) return { ok: true, hobbsStart: args.logStart };
    const hobbsStart = args.planeHobbsTotal;
    if (hobbsStart != null && args.logEnd != null && args.logEnd <= hobbsStart) {
        return { ok: false, error: HOBBS_START_UNRESOLVED_ERROR };
    }
    return { ok: true, hobbsStart };
}

export interface FlightTimes {
    durationMinutes: number;
    timeDC: number;
    timePIC: number;
    timeInstructor: number;
}

export function computeFlightTimes(log: {
    hobbsStart: number | null;
    hobbsEnd: number | null;
    pilotFunction: pilotFunction;
}): FlightTimes {
    const duration = computeDurationMinutes(log.hobbsStart, log.hobbsEnd);
    return {
        durationMinutes: duration,
        timeDC: log.pilotFunction === "EP" ? duration : 0,
        timePIC: log.pilotFunction === "P" ? duration : 0,
        timeInstructor: log.pilotFunction === "I" ? duration : 0,
    };
}

export interface FlightTimesResolved extends FlightTimes {
    // true when the duration was estimated with a provisional start (unsigned flight,
    // hobbsStart not frozen yet). Must NOT be counted in official totals/exports.
    provisional: boolean;
}

// Like computeFlightTimes, but for an unsigned flight (hobbsStart === null) the
// plane's current Hobbs is used as a provisional start to show an INDICATIVE
// duration in the table, consistent with the popup preview. hobbsStart is frozen
// for good on signing (see signFlightLog).
export function computeFlightTimesWithFallback(
    log: {
        hobbsStart: number | null;
        hobbsEnd: number | null;
        pilotFunction: pilotFunction;
    },
    provisionalStart: number | null | undefined
): FlightTimesResolved {
    if (log.hobbsStart != null) {
        return { ...computeFlightTimes(log), provisional: false };
    }
    const times = computeFlightTimes({
        hobbsStart: provisionalStart ?? null,
        hobbsEnd: log.hobbsEnd,
        pilotFunction: log.pilotFunction,
    });
    return { ...times, provisional: times.durationMinutes > 0 };
}

// Flight type / sub-type consistency check.
export function validateNatureSubType(
    nature: flightNature,
    subType: instructionSubType | null | undefined
): { ok: true } | { ok: false; error: string } {
    if (nature === "INSTRUCTION" && !subType) {
        return { ok: false, error: "Un sous-type est requis pour un vol d'instruction" };
    }
    if (nature === "CDB" && subType) {
        return { ok: false, error: "Un sous-type n'est pas attendu pour un vol en commandant de bord" };
    }
    return { ok: true };
}

export const NATURE_LABELS: Record<flightNature, string> = {
    CDB: "Commandant de bord",
    INSTRUCTION: "Instruction",
};

export const INSTRUCTION_SUBTYPE_LABELS: Record<instructionSubType, string> = {
    LOCAL: "Local",
    NAVIGATION: "Navigation",
    LACHE: "Lâché",
    BAPTEME: "Baptême",
    EXAM: "Examen",
};

// Short label (tables and PDF).
export function formatNature(
    nature: flightNature,
    subType: instructionSubType | null
): string {
    if (nature === "CDB") return "CdB";
    if (!subType) return "Instruction";
    return `Instr. (${INSTRUCTION_SUBTYPE_LABELS[subType]})`;
}

// Long label for detailed display.
export function formatNatureLong(
    nature: flightNature,
    subType: instructionSubType | null
): string {
    if (nature === "CDB") return "Commandant de bord";
    if (!subType) return "Instruction";
    return `Instruction — ${INSTRUCTION_SUBTYPE_LABELS[subType]}`;
}
