import { NatureOfTheft } from "@prisma/client";
import { isBaptemeSlot } from "./bapteme";
import { isGuestStudent } from "./sessionContacts";

/**
 * Session type as shown in the "Type" column of the Flights page.
 *
 * Principle: until someone is booked, the type is NOT determined. A slot marked
 * as a discovery flight stays bookable by a club student (the marker only
 * exposes it to the public link), so it can still become an instruction flight.
 * The booking decides.
 *
 * Resolution, in this order:
 *  1. UNDETERMINED: nobody booked, nothing to show;
 *  2. THEORETICAL : classroom session (no plane);
 *  3. BAPTEME     : slot marked DISCOVERY AND an external customer booked;
 *  4. INSTRUCTION : everything else (flight supervised by an instructor).
 *
 * Both discovery-flight conditions are required:
 *  - the marker alone is not enough (a club student can take the slot, it is
 *    then instruction);
 *  - the "invited" sentinel alone is not enough either, since "+ External guest"
 *    (AddStudent) also sets it on a regular session.
 */

// Sentinel stored in flight_sessions.planeID for a classroom session.
export const CLASSROOM_PLANE_ID = "classroomSession";

export type SessionKind = "UNDETERMINED" | "THEORETICAL" | "BAPTEME" | "INSTRUCTION";

// Minimal session shape needed for the resolution.
export interface SessionKindLike {
    planeID: string[];
    natureOfTheft: NatureOfTheft[];
    studentID: string | null;
}

export function resolveSessionKind(session: SessionKindLike): SessionKind {
    // Slot still free: the type stays open.
    if (session.studentID == null) return "UNDETERMINED";
    // Classroom wins: a session without a plane cannot be a discovery flight, even if
    // the marker was set by mistake.
    if (session.planeID.includes(CLASSROOM_PLANE_ID)) return "THEORETICAL";
    if (isBaptemeSlot(session.natureOfTheft) && isGuestStudent(session.studentID)) {
        return "BAPTEME";
    }
    return "INSTRUCTION";
}

export const SESSION_KIND_LABEL: Record<SessionKind, string> = {
    UNDETERMINED: "Non défini",
    THEORETICAL: "Théorique",
    BAPTEME: "Baptême",
    INSTRUCTION: "Instruction",
};
