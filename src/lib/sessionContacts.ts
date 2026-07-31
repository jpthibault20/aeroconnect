import { userRole } from "@prisma/client";
import { BAPTEME_HOLD_STUDENT_ID } from "./bapteme";

/**
 * Coordonnées (téléphone / email) affichées dans le popup d'une séance du
 * calendrier.
 *
 * Règle de visibilité — réciprocité limitée à la séance :
 *  - l'instructeur de la séance voit les coordonnées de SON élève ;
 *  - l'élève inscrit voit celles de SON instructeur ;
 *  - la gestion (ADMIN / OWNER / MANAGER) voit les deux ;
 *  - un membre non concerné par la séance ne voit rien.
 *
 * On ne renvoie jamais ses propres coordonnées (aucun intérêt à s'appeler
 * soi-même).
 */

// Sentinelle posée sur studentID quand un client extérieur (baptême validé) est
// inscrit : ce n'est pas un membre du club, ses coordonnées sont portées par la
// séance (studentEmail / studentPhone) et non par la table User.
export const GUEST_STUDENT_ID = "invited";

// Rôles qui voient les coordonnées de toutes les séances du club.
const CONTACT_OVERSIGHT_ROLES: userRole[] = [
    userRole.ADMIN,
    userRole.OWNER,
    userRole.MANAGER,
];

// Un studentID qui n'est pas un vrai membre (client extérieur ou hold baptême).
export function isGuestStudent(studentID: string | null): boolean {
    return studentID === GUEST_STUDENT_ID || studentID === BAPTEME_HOLD_STUDENT_ID;
}

// Forme minimale d'une séance nécessaire au calcul (sous-ensemble de flight_sessions).
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

// Forme minimale d'un membre du club (sous-ensemble de User).
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
    // Libellé affiché : « Instructeur » / « Élève » (ou « Client » pour un
    // baptême, qui n'est pas un élève du club).
    label: string;
    name: string;
    email: string | null;
    phone: string | null;
}

function isOversight(viewer: Viewer): boolean {
    return CONTACT_OVERSIGHT_ROLES.includes(viewer.role);
}

/** L'élève inscrit (et la gestion) peuvent joindre l'instructeur de la séance. */
export function canSeePilotContact(session: SessionContactLike, viewer: Viewer): boolean {
    if (isOversight(viewer)) return true;
    return session.studentID != null && session.studentID === viewer.id;
}

/** L'instructeur de la séance (et la gestion) peuvent joindre l'élève inscrit. */
export function canSeeStudentContact(session: SessionContactLike, viewer: Viewer): boolean {
    if (isOversight(viewer)) return true;
    return session.pilotID === viewer.id;
}

function fullName(lastName: string | null, firstName: string | null): string {
    return `${(lastName ?? "").toUpperCase()} ${firstName ?? ""}`.trim();
}

/**
 * Coordonnées visibles par `viewer` pour cette séance. `members` sert à
 * retrouver email/téléphone d'un membre ; pour un client extérieur, les
 * coordonnées sont lues sur la séance elle-même.
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
        // Membre : coordonnées à jour depuis son profil. Client extérieur :
        // celles saisies à la réservation, figées sur la séance.
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
