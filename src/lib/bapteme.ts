import { NatureOfTheft, userRole } from "@prisma/client";
import { formatSessionDate, formatSessionTime } from "@/api/global function/dateServeur";
import { CLUB_PLANE_MANAGE_ROLES, resolveOfferedPlaneIDs } from "@/lib/planeVisibility";

/**
 * Pure, tested rules of the public discovery-flight booking.
 *
 * Factored out of the server actions / components to be shared by code and tests
 * (see CLAUDE.md). None of these functions touch Prisma: they work on minimal
 * "*Like" objects, testable with hand-built objects.
 *
 * The "this slot is a discovery flight" marker is DISCOVERY being present in
 * `flight_sessions.natureOfTheft` (array). `flightType` is not used.
 */

// Management roles allowed to accept/reject a discovery-flight request, in
// addition to the pilot assigned to the slot.
export const BAPTEME_MANAGEMENT_ROLES: userRole[] = [
    userRole.OWNER,
    userRole.ADMIN,
    userRole.MANAGER,
];

// Roles allowed to manage (regenerate) the public booking link.
export const PUBLIC_LINK_MANAGE_ROLES: userRole[] = [
    userRole.ADMIN,
    userRole.OWNER,
];

// Sentinel set on flight_sessions.studentID to "hold" a slot while a
// discovery-flight request is PENDING. It blocks any concurrent booking (student
// or guest) and makes the calendar show "pending discovery flight". Distinct from
// "invited" (customer confirmed after validation).
export const BAPTEME_HOLD_STUDENT_ID = "bapteme-hold";

// Lifetime of the hold placed by a PENDING request: the pilot (or management) has
// 24 h to accept before the request expires and the slot reopens. Lives here
// (pure module) and not in the bapteme.ts server action, which is "use server"
// and can only export async functions.
export const HOLD_TTL_MINUTES = 24 * 60;

// Expiry of a hold created at `now`.
export function computeHoldExpiry(now: Date): Date {
    return new Date(now.getTime() + HOLD_TTL_MINUTES * 60 * 1000);
}

// Possible request statuses (mirrors the Prisma BaptemeStatus enum, redeclared
// here to keep this module decoupled from the generated client).
export type BaptemeStatusValue = "PENDING" | "CONFIRMED" | "REJECTED" | "EXPIRED";

export type BaptemeAction = "validate" | "reject" | "expire";

// Minimal slot shape needed by the availability rules.
export interface BaptemeSlotLike {
    studentID: string | null;
    natureOfTheft: NatureOfTheft[];
    sessionDateStart: Date | string;
    planeID: string[];
    classes: number[];
}

// Minimal plane shape.
export interface BaptemePlaneLike {
    id: string;
    ownerID: string | null;
    operational: boolean;
    classes: number;
}

// Minimal discovery-flight request shape.
export interface BaptemeRequestLike {
    status: BaptemeStatusValue;
    expiresAt: Date | string;
}

function toDate(value: Date | string): Date {
    return value instanceof Date ? value : new Date(value);
}

/**
 * A PENDING request past its expiry is expired (lazy expiry). CONFIRMED /
 * REJECTED / EXPIRED statuses are ignored (never "expired" in the hold sense:
 * they no longer block the slot).
 */
export function isHoldExpired(req: BaptemeRequestLike, now: Date): boolean {
    if (req.status !== "PENDING") return false;
    return toDate(req.expiresAt).getTime() < now.getTime();
}

/**
 * Is there an active hold (a non-expired PENDING request) among these requests?
 * Used to hide a slot already "held" by a first customer.
 */
export function hasActiveHold(requests: BaptemeRequestLike[], now: Date): boolean {
    return requests.some((r) => r.status === "PENDING" && !isHoldExpired(r, now));
}

/**
 * Planes that can be offered to the public for a discovery slot: only CLUB planes
 * (ownerID == null, never a private plane), operational, actually offered on the
 * slot (present in slot.planeID) and compatible with the slot's allowed classes
 * (if the slot restricts classes).
 *
 * `unavailablePlaneIDs` lists the planes already taken at the same time by
 * ANOTHER session (competing discovery flight or a member's booking). Without
 * this filter, two simultaneous slots run by different pilots could sell the same
 * plane (and the public would ignore internal bookings). Same rule as
 * `filterPlanesForBeneficiary` on the member side.
 */
export function filterBaptemePlanes<T extends BaptemePlaneLike>(
    planes: T[],
    slot: Pick<BaptemeSlotLike, "planeID" | "classes">,
    unavailablePlaneIDs: string[] = []
): T[] {
    const unavailable = new Set(unavailablePlaneIDs);
    const offeredPlaneIDs = resolveOfferedPlaneIDs(slot.planeID, planes);
    return planes.filter(
        (plane) =>
            plane.ownerID == null &&
            plane.operational &&
            !unavailable.has(plane.id) &&
            offeredPlaneIDs.includes(plane.id) &&
            (slot.classes.length === 0 || slot.classes.includes(plane.classes))
    );
}

/**
 * Can a slot be offered to the public? It must:
 *  - be marked as a discovery flight (natureOfTheft contains DISCOVERY);
 *  - be free (studentID == null);
 *  - have no active PENDING hold;
 *  - be in the future;
 *  - have at least one operational, compatible club plane available.
 *
 * Two time references coexist, and mixing them up leaves a past slot bookable
 * for the duration of the offset (2 h in France in summer):
 *  - `now`: real instant, for hold expiry (a 24 h duration);
 *  - `slotNow`: club clock time, to compare with `sessionDateStart`, which is
 *    stored as UTC wall-clock (see src/lib/clubTime.ts).
 * `slotNow` defaults to `now`: they only differ server-side, where the caller
 * knows how to convert.
 */
export function isBaptemeSlotAvailable(
    slot: BaptemeSlotLike,
    planes: BaptemePlaneLike[],
    requests: BaptemeRequestLike[],
    now: Date,
    slotNow: Date = now,
    unavailablePlaneIDs: string[] = []
): boolean {
    if (!slot.natureOfTheft.includes(NatureOfTheft.DISCOVERY)) return false;
    if (slot.studentID != null) return false;
    if (toDate(slot.sessionDateStart).getTime() <= slotNow.getTime()) return false;
    if (hasActiveHold(requests, now)) return false;
    // A slot whose planes are all taken at that time can no longer be offered: it
    // disappears from the public page by itself.
    return filterBaptemePlanes(planes, slot, unavailablePlaneIDs).length > 0;
}

/**
 * Who can accept/reject a discovery-flight request: the pilot assigned to the
 * slot OR a management role (president / admin / manager).
 */
export function canValidateBapteme(
    user: { id: string; role: userRole },
    slot: { pilotID: string }
): boolean {
    if (BAPTEME_MANAGEMENT_ROLES.includes(user.role)) return true;
    return user.id === slot.pilotID;
}

/**
 * Who can manage (regenerate) the public link: admin and president only.
 */
export function canManagePublicLink(role: userRole): boolean {
    return PUBLIC_LINK_MANAGE_ROLES.includes(role);
}

// ─── Packages (duration + price) ───

// Minimal shape of a discovery-flight package (BaptemeOption).
export interface BaptemeOptionLike {
    durationMin: number;
    price: number;
}

/**
 * Who can create/edit/delete a plane's packages: the same management roles as
 * for the plane itself (see CLUB_PLANE_MANAGE_ROLES), and only on a CLUB plane: a
 * private plane is never offered to the public (see filterBaptemePlanes), so it
 * has no package.
 */
export function canManageBaptemeOptions(
    plane: { ownerID: string | null },
    user: { role: userRole }
): boolean {
    return plane.ownerID == null && CLUB_PLANE_MANAGE_ROLES.includes(user.role);
}

/** Price formatted in euros, French style: "90 €", "89,90 €". */
export function formatBaptemeOptionPrice(price: number): string {
    const formatted = new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: price % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    }).format(price);
    // Intl inserts a narrow no-break space (U+202F) before "€": replaced with a
    // regular space to stay predictable wherever this text ends up (flight comment,
    // plain-text email, string comparisons).
    return formatted.replace(/[  ]/g, " ");
}

/** Package label in the public selector and internal reminders. */
export function formatBaptemeOptionLabel(option: BaptemeOptionLike): string {
    return `${option.durationMin} min – ${formatBaptemeOptionPrice(option.price)}`;
}

/**
 * Comment written on the slot (flight_sessions.studentComment): the chosen
 * package first (if the plane had one configured), then the customer's free
 * comment. Pure so it stays testable and shared between hold creation and request
 * validation, which must produce exactly the same text.
 */
export function buildBaptemeSessionComment(
    option: BaptemeOptionLike | null,
    clientComment: string | null
): string | null {
    const parts: string[] = [];
    if (option) parts.push(`Formule : ${formatBaptemeOptionLabel(option)}`);
    if (clientComment) parts.push(clientComment);
    return parts.length > 0 ? parts.join("\n") : null;
}

/**
 * Flight types written on a slot depending on the "discovery flight" switch of
 * session creation. DISCOVERY is the ONLY marker used (it is what
 * getPublicBaptemeSlots queries): unchecked, nothing is left behind.
 */
export function natureOfTheftForBapteme(isBapteme: boolean): NatureOfTheft[] {
    return isBapteme ? [NatureOfTheft.DISCOVERY] : [];
}

/** Does a slot carry the discovery-flight marker? */
export function isBaptemeSlot(natureOfTheft: NatureOfTheft[]): boolean {
    return natureOfTheft.includes(NatureOfTheft.DISCOVERY);
}

/**
 * Pilot name as shown to the customer (public page AND confirmation email):
 * first name then last name in capitals.
 */
export function formatPilotName(firstName: string, lastName: string): string {
    return `${firstName} ${lastName.toUpperCase()}`.trim();
}

// Public booking horizon: slots beyond it are not offered. Bounds the payload
// sent to the browser (a big club may have hundreds of open discovery slots) and
// avoids committing the club to a far-off date.
export const PUBLIC_BOOKING_HORIZON_DAYS = 60;

// Minimal slot shape for grouping on the public page.
export interface GroupableSlotLike {
    sessionID: string;
    sessionDateStart: Date | string;
    durationMin: number;
    pilotFirstName: string;
    pilotLastName: string;
}

// A time of day. Several sessions can share it: as many pilots offering a
// discovery flight at the same hour.
export interface BaptemeTimeGroup<T extends GroupableSlotLike> {
    timeKey: string;
    sessionDateStart: Date;
    durationMin: number;
    sessions: T[];
}

export interface BaptemeDayGroup<T extends GroupableSlotLike> {
    dayKey: string;
    date: Date;
    times: BaptemeTimeGroup<T>[];
}

const pad2 = (n: number) => String(n).padStart(2, "0");

// Keys built on UTC parts: slots are stored as UTC wall-clock, a local read would
// group them wrongly (and change day for late evening slots).
export function baptemeDayKey(date: Date | string): string {
    const d = toDate(date);
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function baptemeTimeKey(date: Date | string): string {
    const d = toDate(date);
    return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

/**
 * Groups the public slots by day, then by time.
 *
 * A flat list does not scale: a club with 3 pilots offering 8 slots a day over
 * two months produces hundreds of entries, many sharing the same time. The
 * customer therefore picks a day, then a time; the pilots offering that time are
 * grouped under it.
 *
 * Pure, deterministically sorted (ascending day, then ascending time): the order
 * does not depend on the one received from the server.
 */
export function groupBaptemeSlots<T extends GroupableSlotLike>(slots: T[]): BaptemeDayGroup<T>[] {
    const days = new Map<string, Map<string, BaptemeTimeGroup<T>>>();

    for (const slot of slots) {
        const start = toDate(slot.sessionDateStart);
        const dayKey = baptemeDayKey(start);
        const timeKey = baptemeTimeKey(start);

        let times = days.get(dayKey);
        if (!times) {
            times = new Map();
            days.set(dayKey, times);
        }

        const group = times.get(timeKey);
        if (group) {
            group.sessions.push(slot);
        } else {
            times.set(timeKey, {
                timeKey,
                sessionDateStart: start,
                durationMin: slot.durationMin,
                sessions: [slot],
            });
        }
    }

    return Array.from(days.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dayKey, times]) => ({
            dayKey,
            // All the day's sessions share the same date: take the first time's for the label.
            date: Array.from(times.values())[0].sessionDateStart,
            times: Array.from(times.values()).sort((a, b) => a.timeKey.localeCompare(b.timeKey)),
        }));
}

/** Month label in the public selector: "Septembre 2026". */
export function formatBaptemeMonthLabel(date: Date | string): string {
    const label = toDate(date).toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
}

export interface BaptemeMonthGroup<T extends GroupableSlotLike> {
    monthKey: string;
    label: string;
    days: BaptemeDayGroup<T>[];
}

/**
 * Groups already grouped days (see groupBaptemeSlots) by month. Used to only
 * require a "choose the month" screen when the booking horizon actually spans
 * several months: with a single month this intermediate selector adds nothing.
 *
 * `days` being sorted by ascending day, the Map insertion order is enough to keep
 * months sorted: no need to re-sort here.
 */
export function groupBaptemeDaysByMonth<T extends GroupableSlotLike>(
    days: BaptemeDayGroup<T>[]
): BaptemeMonthGroup<T>[] {
    const months = new Map<string, BaptemeDayGroup<T>[]>();
    for (const day of days) {
        const d = toDate(day.date);
        const monthKey = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
        const list = months.get(monthKey);
        if (list) list.push(day);
        else months.set(monthKey, [day]);
    }
    return Array.from(months.entries()).map(([monthKey, monthDays]) => ({
        monthKey,
        label: formatBaptemeMonthLabel(monthDays[0].date),
        days: monthDays,
    }));
}

/**
 * Public booking entry points. Customers rarely come with the same criterion in
 * mind: some have a fixed date, others want "the little red one" seen on the
 * photo, others a pilot they were recommended. The step order follows the chosen
 * criterion, which avoids walking them through irrelevant lists.
 */
export type BaptemeEntryPoint = "date" | "plane" | "pilot";

/**
 * Distinct planes offered, all dates included. First step of the "by plane"
 * entry. Sorted by name for a stable order.
 */
export function listBaptemePlanes<P extends { id: string; name: string }>(
    slots: { planes: P[] }[]
): P[] {
    const byID = new Map<string, P>();
    for (const slot of slots) {
        for (const plane of slot.planes) {
            if (!byID.has(plane.id)) byID.set(plane.id, plane);
        }
    }
    return Array.from(byID.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export interface BaptemePilotOption {
    key: string;
    firstName: string;
    lastName: string;
}

/**
 * Public identifier of a pilot. Based on their displayed name rather than their
 * internal id, which has no business on an anonymous page. Two pilots with
 * exactly the same name would be merged, but they are indistinguishable to the
 * customer anyway.
 */
export function baptemePilotKey(firstName: string, lastName: string): string {
    return formatPilotName(firstName, lastName);
}

/** Distinct pilots offering at least one slot. */
export function listBaptemePilots(
    slots: Pick<GroupableSlotLike, "pilotFirstName" | "pilotLastName">[]
): BaptemePilotOption[] {
    const byKey = new Map<string, BaptemePilotOption>();
    for (const slot of slots) {
        const key = baptemePilotKey(slot.pilotFirstName, slot.pilotLastName);
        if (!byKey.has(key)) {
            byKey.set(key, { key, firstName: slot.pilotFirstName, lastName: slot.pilotLastName });
        }
    }
    return Array.from(byKey.values()).sort((a, b) => a.key.localeCompare(b.key, "fr"));
}

// Minimal slot shape to build its public label.
export interface BaptemeSlotLabelLike {
    sessionDateStart: Date | string;
    durationMin: number;
    pilotFirstName: string;
    pilotLastName: string;
}

/**
 * Slot label in the public selector:
 * "mercredi 12 août · 14:00 → 15:00 · Luc DUPONT".
 *
 * Times go through formatSessionDate/Time (UTC read): slots are stored as "UTC
 * wall-clock", local formatting would shift the display by the visitor's time
 * zone.
 */
export function formatBaptemeSlotLabel(slot: BaptemeSlotLabelLike): string {
    const start = toDate(slot.sessionDateStart);
    const end = new Date(start.getTime() + slot.durationMin * 60 * 1000);
    const pilot = formatPilotName(slot.pilotFirstName, slot.pilotLastName);
    return `${formatSessionDate(start)} · ${formatSessionTime(start)} → ${formatSessionTime(end)} · ${pilot}`;
}

/**
 * Status transition of a request. Only a PENDING request can change; any action
 * on an already handled request returns an error (idempotency guard: prevents a
 * concurrent double validation).
 */
export function nextBaptemeStatus(
    current: BaptemeStatusValue,
    action: BaptemeAction
): BaptemeStatusValue | { error: string } {
    if (current !== "PENDING") {
        return { error: "Cette demande a déjà été traitée." };
    }
    switch (action) {
        case "validate":
            return "CONFIRMED";
        case "reject":
            return "REJECTED";
        case "expire":
            return "EXPIRED";
    }
}
