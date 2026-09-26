import { planes, userRole } from "@prisma/client";
import { differenceInMinutes } from "date-fns";
import { convertMinutesToHours } from "@/api/global function/dateServeur";
import { canViewPlane, isPrivatePlane, sessionOffersPlane } from "@/lib/planeVisibility";

/**
 * Pure, tested rules of slot actions (AER-67).
 *
 * The server actions in src/api/db/sessions.ts only receive IDs from the client:
 * session, club, user and plane are RE-READ FROM THE DB, then passed to these
 * functions. No rule therefore relies on an object sent by the browser, which a
 * modified client could forge.
 *
 * Compared dates are in "club clock time" (see clubTime.ts): `now` must come from
 * toClubWallClock(new Date()), computed server-side.
 */

export type RuleResult = { ok: true } | { ok: false; error: string };

const ok: RuleResult = { ok: true };
const refuse = (error: string): RuleResult => ({ ok: false, error });

export const CLASSROOM_SESSION_ID = "classroomSession";

// Roles that can book themselves on a slot.
export const SELF_REGISTRATION_ROLES: userRole[] = [
    userRole.STUDENT, userRole.PILOT, userRole.OWNER, userRole.ADMIN, userRole.INSTRUCTOR,
];

// Roles that can unsubscribe any student of their club, with no deadline.
export const UNSUBSCRIBE_STAFF_ROLES: userRole[] = [
    userRole.ADMIN, userRole.INSTRUCTOR, userRole.OWNER, userRole.MANAGER,
];

// Roles that can edit both notes of a slot.
export const COMMENT_STAFF_ROLES: userRole[] = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER];

type PlaneForRules = Pick<planes, "id" | "clubID" | "ownerID" | "operational" | "classes">;

export interface RegistrationContext {
    user: { id: string; role: userRole; restricted: boolean; clubID: string | null; classes: number[] };
    club: { userCanSubscribe: boolean; timeDelaySubscribeminutes: number };
    session: { clubID: string; sessionDateStart: Date; studentID: string | null; planeID: string[] };
    planeID: string;
    /** Plane re-read from the DB; null for a classroom session or a missing plane. */
    plane: PlaneForRules | null;
    /** Club planes (to resolve the "all club planes" marker). */
    clubPlanes: Pick<planes, "id" | "ownerID">[];
    now: Date;
    /** The student or the plane is already taken at the same time. */
    hasConflict: boolean;
    /** Slot held by a pending discovery-flight request. */
    heldByBapteme: boolean;
}

/**
 * Booking of a user BY THEMSELVES on a slot. The booked student is always the
 * signed-in user: booking someone else goes through addStudentToSession
 * (management only).
 */
export function checkStudentRegistration(ctx: RegistrationContext): RuleResult {
    const { user, club, session, planeID, plane, now } = ctx;

    if (!user.clubID || session.clubID !== user.clubID) {
        return refuse("Session introuvable ou non accessible.");
    }
    if (!club.userCanSubscribe) {
        return refuse("Les inscriptions sont désactivées par le club, se raprocher de l'administrateur du club.");
    }
    if (user.restricted) {
        return refuse("Contacter l'administrateur pour plus d'informations. (E_002: restricted)");
    }
    if (!SELF_REGISTRATION_ROLES.includes(user.role)) {
        return refuse("Vous n'avez pas les droits pour vous inscrire à une session. (E_003: User)");
    }

    // Plane: classroom session offered on the slot, a club plane offered by the
    // slot, or the student's private plane.
    if (planeID === CLASSROOM_SESSION_ID) {
        if (!session.planeID.includes(CLASSROOM_SESSION_ID)) {
            return refuse("La séance théorique n'est pas proposée sur ce créneau.");
        }
    } else {
        if (!plane || plane.clubID !== session.clubID) {
            return refuse("Machine introuvable.");
        }
        if (!plane.operational) {
            return refuse("L'avion est désactivé par l'administrateur du club.");
        }
        if (!canViewPlane(plane, user)) {
            return refuse("Cette machine privée ne vous appartient pas.");
        }
        const ownPlane = isPrivatePlane(plane) && plane.ownerID === user.id;
        if (!ownPlane && !sessionOffersPlane(session.planeID, plane.id, ctx.clubPlanes)) {
            return refuse("Cette machine n'est pas proposée sur ce créneau.");
        }
        if (!user.classes.includes(plane.classes)) {
            return refuse("Vous n'êtes pas qualifié sur la classe de cette machine.");
        }
    }

    const limit = new Date(now.getTime() + club.timeDelaySubscribeminutes * 60_000);
    if (session.sessionDateStart < limit) {
        return refuse(`La session doit être dans minimum ${convertMinutesToHours(club.timeDelaySubscribeminutes)}. contacter l'instructeur pour vous inscrire`);
    }
    if (ctx.hasConflict) {
        return refuse("Conflit détecté avec une autre session (élève ou avion).");
    }
    if (ctx.heldByBapteme) {
        return refuse("Ce créneau est réservé pour un baptême en attente de validation.");
    }
    if (session.studentID != null) {
        return refuse("Ce créneau est déjà réservé.");
    }
    return ok;
}

export interface RemovalContext {
    user: { id: string; role: userRole; clubID: string | null };
    club: { userCanUnsubscribe: boolean; timeDelayUnsubscribeminutes: number };
    session: { clubID: string; studentID: string | null; sessionDateStart: Date };
    now: Date;
}

/**
 * Unsubscribing a student. Staff (instructor, management) unsubscribe any
 * student of their club with no deadline; others can ONLY remove their own
 * booking, within the club's rules.
 */
export function checkStudentRemoval({ user, club, session, now }: RemovalContext): RuleResult {
    if (!user.clubID || session.clubID !== user.clubID) {
        return refuse("Session introuvable ou non accessible.");
    }
    if (!session.studentID) {
        return refuse("Aucun élève n'est inscrit sur ce créneau.");
    }
    if (UNSUBSCRIBE_STAFF_ROLES.includes(user.role)) return ok;

    if (session.studentID !== user.id) {
        return refuse("Vous ne pouvez désinscrire que vous-même.");
    }
    if (!club.userCanUnsubscribe) {
        return refuse("Les inscriptions sont désactivées par le club, se raprocher de l'administrateur du club.");
    }
    const minutesUntil = differenceInMinutes(session.sessionDateStart, now);
    if (session.sessionDateStart < now || minutesUntil < club.timeDelayUnsubscribeminutes) {
        return refuse(`La session ne peut être modifiée que si elle est dans plus de ${convertMinutesToHours(club.timeDelayUnsubscribeminutes)}`);
    }
    return ok;
}

export interface CommentUpdateContext {
    user: { id: string; role: userRole; clubID: string | null };
    session: { clubID: string; pilotID: string; studentID: string | null; pilotComment: string | null; studentComment: string | null };
    pilotComment: string;
    studentComment: string;
}

export type CommentUpdate =
    | { ok: true; data: { pilotComment: string | null; studentComment: string | null } }
    | { ok: false; error: string };

/**
 * Slot notes: management edits both; the pilot (instructor) their note, the
 * student theirs. The other party's note is kept as in the DB, even if the client
 * sends another value.
 */
export function resolveCommentUpdate({ user, session, pilotComment, studentComment }: CommentUpdateContext): CommentUpdate {
    if (!user.clubID || session.clubID !== user.clubID) {
        return { ok: false, error: "Permissions insuffisantes" };
    }
    const isStaff = COMMENT_STAFF_ROLES.includes(user.role);
    const isPilot = user.id === session.pilotID;
    const isStudent = !!session.studentID && user.id === session.studentID;
    if (!isStaff && !isPilot && !isStudent) {
        return { ok: false, error: "Permissions insuffisantes" };
    }
    return {
        ok: true,
        data: {
            pilotComment: isStaff || isPilot ? pilotComment : session.pilotComment,
            studentComment: isStaff || isStudent ? studentComment : session.studentComment,
        },
    };
}

/**
 * Creating slots for an instructor (re-read from the DB): management for any
 * instructor of the club, otherwise only for oneself.
 */
export function canCreateSessionsFor(
    actor: { id: string; role: userRole; clubID: string | null },
    instructor: { id: string; clubID: string | null } | null,
    managerRoles: userRole[]
): RuleResult {
    if (!instructor) return refuse("L'instructeur est obligatoire");
    if (!actor.clubID || instructor.clubID !== actor.clubID) return refuse("Non autorisé");
    if (!managerRoles.includes(actor.role) && actor.id !== instructor.id) return refuse("Non autorisé");
    return ok;
}
