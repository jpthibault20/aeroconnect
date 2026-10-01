import { flight_logs } from "@prisma/client";

/**
 * Logbook display / export helpers, factored into pure functions shared by the
 * components and the tests (see CLAUDE.md).
 */

// ─── Plane logbook: PDF export ───

export interface MachineLogGroup<T> {
    planeRegistration: string;
    planeName: string;
    logs: T[];
}

/**
 * Groups flights by plane for the "All planes" export (one PDF section per
 * plane). The grouping key is planeID if present, otherwise the denormalized
 * registration (robust to deleted planes). The section's name and registration
 * come from the first flight's denormalized fields. Sorted by registration.
 */
export function groupLogsByMachine<
    T extends Pick<flight_logs, "planeID" | "planeRegistration" | "planeName">
>(logs: T[]): MachineLogGroup<T>[] {
    const groups = new Map<string, T[]>();
    for (const log of logs) {
        const key = log.planeID ?? log.planeRegistration ?? "—";
        const arr = groups.get(key);
        if (arr) arr.push(log);
        else groups.set(key, [log]);
    }
    return [...groups.values()]
        .map((groupLogs) => ({
            planeRegistration: groupLogs[0]?.planeRegistration ?? "",
            planeName: groupLogs[0]?.planeName ?? "",
            logs: groupLogs,
        }))
        .sort((a, b) => a.planeRegistration.localeCompare(b.planeRegistration));
}

/** The plane logbook can be exported as soon as there is at least one flight. */
export function canExportAircraftLogbook(logs: unknown[]): boolean {
    return logs.length > 0;
}

// ─── "Signed" button / column ───

export type SignButtonState = "signed" | "pending" | "signable";

/**
 * State shown for a flight in the "Signed" column:
 *  - "signed"   : already signed (green badge);
 *  - "pending"  : unsigned, but the user cannot sign (read-only or not the
 *                 flight's pilot) → "Pending" status;
 *  - "signable" : unsigned and the user is the pilot → "Sign" button.
 */
export function signButtonState(
    log: Pick<flight_logs, "pilotSigned" | "pilotID">,
    currentUserID: string | undefined,
    readOnly: boolean
): SignButtonState {
    if (log.pilotSigned) return "signed";
    if (readOnly || currentUserID !== log.pilotID) return "pending";
    return "signable";
}

// ─── Showing the student (plane logbook) ───

/**
 * Should the student be shown on the row? Only for an instruction flight with a
 * student set (CDB flights have no student).
 */
export function shouldShowStudent(
    log: Pick<flight_logs, "flightNature" | "studentFirstName" | "studentLastName">
): boolean {
    return log.flightNature === "INSTRUCTION" && !!(log.studentFirstName || log.studentLastName);
}
