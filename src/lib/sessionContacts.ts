import { userRole } from "@prisma/client";
import { BAPTEME_HOLD_STUDENT_ID } from "./bapteme";

/**
 * Contact details (phone / email) shown in a calendar session popup.
 *
 * Visibility rule, reciprocity limited to the session:
 *  - the session's instructor sees THEIR student's details;
 *  - the booked student sees THEIR instructor's;
 *  - management (ADMIN / OWNER / MANAGER) sees both;
 *  - a member unrelated to the session sees nothing.
 *
 * One's own details are never returned (no point calling oneself).
 */

// Sentinel set on studentID when an external customer (accepted discovery
// flight) is booked: not a club member, their details are carried by the session
// (studentEmail / studentPhone), not by the User table.
export const GUEST_STUDENT_ID = "invited";

// Roles that see the contact details of every club session.
const CONTACT_OVERSIGHT_ROLES: userRole[] = [
    userRole.ADMIN,
    userRole.OWNER,
    userRole.MANAGER,
];

// A studentID that is not a real member (external customer or discovery-flight hold).
export function isGuestStudent(studentID: string | null): boolean {
    return studentID === GUEST_STUDENT_ID || studentID === BAPTEME_HOLD_STUDENT_ID;
}

// Minimal session shape needed for the computation (subset of flight_sessions).
export interface SessionContactLike {
    pilotID: string;
    pilotFirstName: string;
    pilotLastName: string;
    studentID: string | null;
    studentFirstName: string | null;
    studentLastName: string | null;
    studentEmail: string | null;
    studentPhone: string | null;
}

// Minimal club member shape (subset of User).
export interface MemberLike {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
}

export interface Viewer {
    id: string;
    role: userRole;
}

export interface SessionContact {
    role: "pilot" | "student";
    // Displayed label: "Instructeur" / "Élève" (or "Client" for a discovery flight,
    // who is not a club student).
    label: string;
    name: string;
    email: string | null;
    phone: string | null;
}

function isOversight(viewer: Viewer): boolean {
    return CONTACT_OVERSIGHT_ROLES.includes(viewer.role);
}

/** The booked student (and management) can reach the session's instructor. */
export function canSeePilotContact(session: SessionContactLike, viewer: Viewer): boolean {
    if (isOversight(viewer)) return true;
    return session.studentID != null && session.studentID === viewer.id;
}

/** The session's instructor (and management) can reach the booked student. */
export function canSeeStudentContact(session: SessionContactLike, viewer: Viewer): boolean {
    if (isOversight(viewer)) return true;
    return session.pilotID === viewer.id;
}

function fullName(lastName: string | null, firstName: string | null): string {
    return `${(lastName ?? "").toUpperCase()} ${firstName ?? ""}`.trim();
}

/**
 * Contact details visible to `viewer` for this session. `members` is used to
 * find a member's email/phone; for an external customer, the details are read
 * from the session itself.
 */
export function resolveSessionContacts(
    session: SessionContactLike,
    viewer: Viewer,
    members: MemberLike[]
): SessionContact[] {
    const contacts: SessionContact[] = [];

    if (session.pilotID !== viewer.id && canSeePilotContact(session, viewer)) {
        const pilot = members.find((m) => m.id === session.pilotID);
        contacts.push({
            role: "pilot",
            label: "Instructeur",
            name: fullName(session.pilotLastName, session.pilotFirstName),
            email: pilot?.email ?? null,
            phone: pilot?.phone ?? null,
        });
    }

    const studentID = session.studentID;
    if (studentID != null && studentID !== viewer.id && canSeeStudentContact(session, viewer)) {
        const guest = isGuestStudent(studentID);
        // Member: up-to-date details from their profile. External customer: those
        // entered at booking, frozen on the session.
        const member = guest ? undefined : members.find((m) => m.id === studentID);
        contacts.push({
            role: "student",
            label: guest ? "Client" : "Élève",
            name: fullName(session.studentLastName, session.studentFirstName),
            email: guest ? session.studentEmail : (member?.email ?? null),
            phone: guest ? session.studentPhone : (member?.phone ?? null),
        });
    }

    return contacts;
}
