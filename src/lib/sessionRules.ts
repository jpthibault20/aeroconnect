import { planes, userRole } from "@prisma/client";
import { differenceInMinutes } from "date-fns";
import { convertMinutesToHours } from "@/api/global function/dateServeur";
import { canViewPlane, isPrivatePlane, sessionOffersPlane } from "@/lib/planeVisibility";

/**
 * Règles (pures, testées) des actions sur les créneaux (AER-67).
 *
 * Les server actions de src/api/db/sessions.ts ne reçoivent plus du client que
 * des identifiants : session, club, utilisateur et machine sont RELUS EN BASE,
 * puis passés à ces fonctions. Aucune règle ne repose donc sur un objet
 * envoyé par le navigateur, qu'un client modifié pourrait falsifier.
 *
 * Les dates comparées sont en « heure de pendule du club » (cf. clubTime.ts) :
 * `now` doit venir de toClubWallClock(new Date()), calculé côté serveur.
 */

export type RuleResult = { ok: true } | { ok: false; error: string };

const ok: RuleResult = { ok: true };
const refuse = (error: string): RuleResult => ({ ok: false, error });

export const CLASSROOM_SESSION_ID = "classroomSession";

// Rôles pouvant s'inscrire eux-mêmes à un créneau.
export const SELF_REGISTRATION_ROLES: userRole[] = [
    userRole.STUDENT, userRole.PILOT, userRole.OWNER, userRole.ADMIN, userRole.INSTRUCTOR,
];

// Rôles pouvant désinscrire n'importe quel élève de leur club, sans délai.
export const UNSUBSCRIBE_STAFF_ROLES: userRole[] = [
    userRole.ADMIN, userRole.INSTRUCTOR, userRole.OWNER, userRole.MANAGER,
];

// Rôles pouvant modifier les deux notes d'un créneau.
export const COMMENT_STAFF_ROLES: userRole[] = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER];

type PlaneForRules = Pick<planes, "id" | "clubID" | "ownerID" | "operational" | "classes">;

export interface RegistrationContext {
    user: { id: string; role: userRole; restricted: boolean; clubID: string | null; classes: number[] };
    club: { userCanSubscribe: boolean; timeDelaySubscribeminutes: number };
    session: { clubID: string; sessionDateStart: Date; studentID: string | null; planeID: string[] };
    planeID: string;
    /** Machine relue en base ; null pour la séance en salle ou une machine introuvable. */
    plane: PlaneForRules | null;
    /** Machines du club (résolution du marqueur « toutes les machines du club »). */
    clubPlanes: Pick<planes, "id" | "ownerID">[];
    now: Date;
    /** L'élève ou la machine est déjà pris au même horaire. */
    hasConflict: boolean;
    /** Créneau tenu par une demande de baptême en attente. */
    heldByBapteme: boolean;
}

/**
 * Inscription d'un utilisateur PAR LUI-MÊME à un créneau. L'élève inscrit est
 * toujours l'utilisateur connecté : inscrire un tiers passe par
 * addStudentToSession (gestion uniquement).
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

    // Machine : séance en salle proposée sur le créneau, ou machine du club
    // offerte par le créneau, ou machine privée de l'élève.
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
 * Désinscription d'un élève. Le personnel (instructeur, gestion) désinscrit
 * n'importe quel élève de son club, sans délai ; les autres ne peuvent retirer
 * QUE leur propre inscription, dans les règles du club.
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
 * Notes d'un créneau : la gestion modifie les deux ; le pilote (instructeur)
 * sa note, l'élève la sienne. La note de l'autre est conservée telle qu'en
 * base, même si le client en envoie une autre valeur.
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
 * Création de créneaux pour un instructeur (relu en base) : gestion pour
 * n'importe quel instructeur du club, sinon uniquement pour soi-même.
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
