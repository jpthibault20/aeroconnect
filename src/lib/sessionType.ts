import { NatureOfTheft } from "@prisma/client";
import { isBaptemeSlot } from "./bapteme";
import { isGuestStudent } from "./sessionContacts";

/**
 * Nature d'une séance telle qu'affichée dans la colonne « Type » de la page
 * Vols.
 *
 * Principe : tant que personne n'est inscrit, le type n'est PAS déterminé. Un
 * créneau marqué baptême reste réservable par un élève du club (le marqueur ne
 * fait que l'exposer au lien public) : il peut donc encore devenir un vol
 * d'instruction. C'est l'inscription qui tranche.
 *
 * Résolution, dans cet ordre :
 *  1. UNDETERMINED — aucun inscrit : rien à afficher ;
 *  2. THEORETICAL  — séance en salle (pas d'appareil) ;
 *  3. BAPTEME      — créneau marqué DISCOVERY ET client extérieur inscrit ;
 *  4. INSTRUCTION  — tout le reste (vol encadré par un instructeur).
 *
 * Les deux conditions du baptême sont nécessaires :
 *  - le marqueur seul ne suffit pas (un élève du club peut prendre le créneau,
 *    c'est alors de l'instruction) ;
 *  - la sentinelle "invited" seule ne suffit pas non plus, « + Invité externe »
 *    (AddStudent) la posant aussi sur une séance ordinaire.
 */

// Sentinelle placée dans flight_sessions.planeID pour une séance en salle.
export const CLASSROOM_PLANE_ID = "classroomSession";

export type SessionKind = "UNDETERMINED" | "THEORETICAL" | "BAPTEME" | "INSTRUCTION";

// Forme minimale d'une séance nécessaire à la résolution.
export interface SessionKindLike {
    planeID: string[];
    natureOfTheft: NatureOfTheft[];
    studentID: string | null;
}

export function resolveSessionKind(session: SessionKindLike): SessionKind {
    // Créneau encore libre : le type reste ouvert.
    if (session.studentID == null) return "UNDETERMINED";
    // La salle de cours prime : une séance sans appareil ne peut pas être un
    // baptême, même si le marqueur a été posé par erreur.
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
