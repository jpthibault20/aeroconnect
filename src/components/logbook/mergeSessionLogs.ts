import { flight_logs } from "@prisma/client";

// An instruction session generates two flight_logs (instructor "I" + student
// "EP") for the same flight. This helper merges each pair into a single row to
// avoid duplicates (counter, totals, lists). The non-EP entry is the base and
// inherits the extra fields of the student entry (studentID, etc.). Logs without
// a sessionID (manual entries, private flights) pass through unchanged.
export function mergeSessionLogs(logs: flight_logs[]): flight_logs[] {
    const bySession = new Map<string, flight_logs>();

    for (const log of logs) {
        if (!log.sessionID) continue;
        const existing = bySession.get(log.sessionID);
        if (!existing) {
            bySession.set(log.sessionID, log);
            continue;
        }

        // The pilot/instructor entry (I or P) is the base; the student entry (EP) only
        // fills in missing person references.
        const isLogPrimary = log.pilotFunction !== "EP";
        const base = isLogPrimary ? log : existing;
        const other = isLogPrimary ? existing : log;

        bySession.set(log.sessionID, {
            ...base,
            studentID: base.studentID ?? other.studentID,
            studentFirstName: base.studentFirstName ?? other.studentFirstName,
            studentLastName: base.studentLastName ?? other.studentLastName,
            instructorID: base.instructorID ?? other.instructorID,
            instructorFirstName: base.instructorFirstName ?? other.instructorFirstName,
            instructorLastName: base.instructorLastName ?? other.instructorLastName,
        });
    }

    const seen = new Set<string>();
    const result: flight_logs[] = [];
    for (const log of logs) {
        if (!log.sessionID) {
            result.push(log);
            continue;
        }
        if (seen.has(log.sessionID)) continue;
        seen.add(log.sessionID);
        const merged = bySession.get(log.sessionID);
        if (merged) result.push(merged);
    }
    return result;
}
