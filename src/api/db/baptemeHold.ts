import prisma from "../prisma";
import { BAPTEME_HOLD_STUDENT_ID } from "@/lib/bapteme";

/**
 * Handles the "hold" a PENDING discovery-flight request places on a slot
 * (flight_sessions.studentID = sentinel). Kept in its own module so bapteme.ts,
 * sessions.ts AND users.ts can import it without a circular import
 * (users.ts <-> bapteme.ts via requireAuth).
 *
 * NO "use server" directive: this module only exposes internal helpers called
 * from other server modules (never from a client component). A "use server"
 * file can only export async functions, and RELEASE_SESSION_DATA is data.
 */

// Data that "releases" a slot: puts the session back to a free state.
export const RELEASE_SESSION_DATA = {
    studentID: null,
    studentFirstName: null,
    studentLastName: null,
    studentEmail: null,
    studentPhone: null,
    studentPlaneID: null,
    studentComment: null,
} as const;

/**
 * Lazy expiry: sets expired PENDING requests to EXPIRED AND frees the slots they
 * held (sentinel studentID -> null). Optionally scoped by club and/or slot.
 * Run on read / before any write.
 */
export async function expireStaleHolds(
    now: Date,
    scope: { clubID?: string; sessionID?: string } = {}
) {
    const stale = await prisma.baptemeRequest.findMany({
        where: {
            status: "PENDING",
            expiresAt: { lt: now },
            ...(scope.clubID ? { clubID: scope.clubID } : {}),
            ...(scope.sessionID ? { sessionID: scope.sessionID } : {}),
        },
        select: { id: true, sessionID: true },
    });
    if (stale.length === 0) return;

    await prisma.$transaction([
        prisma.baptemeRequest.updateMany({
            where: { id: { in: stale.map((s) => s.id) } },
            data: { status: "EXPIRED" },
        }),
        prisma.flight_sessions.updateMany({
            where: {
                id: { in: stale.map((s) => s.sessionID) },
                studentID: BAPTEME_HOLD_STUDENT_ID,
            },
            data: RELEASE_SESSION_DATA,
        }),
    ]);
}

/**
 * Frees a slot if its discovery-flight hold has expired, then says whether an
 * ACTIVE hold still blocks it. Used by the regular booking paths
 * (studentRegistration / addStudentToSession) so no student or guest takes a
 * slot held by a pending discovery-flight request.
 */
export const resolveBaptemeHold = async (sessionID: string) => {
    if (!sessionID) return { held: false };
    const now = new Date();
    try {
        await expireStaleHolds(now, { sessionID });
        const activeHolds = await prisma.baptemeRequest.count({
            where: { sessionID, status: "PENDING" },
        });
        return { held: activeHolds > 0 };
    } catch {
        // On error, do not block the booking (fail-open).
        return { held: false };
    }
};
