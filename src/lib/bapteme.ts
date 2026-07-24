import { NatureOfTheft, userRole } from "@prisma/client";

/**
 * Règles (pures, testées) de la réservation publique de vols baptême.
 *
 * Factorisé hors des server actions / composants pour être partagé entre le
 * code et les tests (cf. convention CLAUDE.md). Aucune de ces fonctions ne
 * touche Prisma : elles opèrent sur des objets « *Like » minimalistes, ce qui
 * les rend testables avec des objets construits à la main.
 *
 * Le marqueur « ce créneau est un baptême » est la présence de DISCOVERY dans
 * `flight_sessions.natureOfTheft` (tableau). `flightType` n'est pas utilisé.
 */

// Rôles de gestion habilités à valider/refuser une demande de baptême, en plus
// du pilote assigné au créneau.
export const BAPTEME_MANAGEMENT_ROLES: userRole[] = [
    userRole.OWNER,
    userRole.ADMIN,
    userRole.MANAGER,
];

// Rôles habilités à gérer (régénérer) le lien public de réservation.
export const PUBLIC_LINK_MANAGE_ROLES: userRole[] = [
    userRole.ADMIN,
    userRole.OWNER,
];

// Sentinelle posée sur flight_sessions.studentID pour « tenir » un créneau
// pendant qu'une demande de baptême est PENDING (hold). Elle bloque toute
// inscription concurrente (élève ou invité) et déclenche l'affichage du libellé
// « baptême en attente » dans le calendrier. Distincte de "invited" (client
// confirmé après validation).
export const BAPTEME_HOLD_STUDENT_ID = "bapteme-hold";

// Valeurs possibles du statut d'une demande (miroir de l'enum Prisma
// BaptemeStatus, redéclaré ici pour garder ce module découplé du client généré).
export type BaptemeStatusValue = "PENDING" | "CONFIRMED" | "REJECTED" | "EXPIRED";

export type BaptemeAction = "validate" | "reject" | "expire";

// Forme minimale d'un créneau nécessaire aux règles de disponibilité.
export interface BaptemeSlotLike {
    studentID: string | null;
    natureOfTheft: NatureOfTheft[];
    sessionDateStart: Date | string;
    planeID: string[];
    classes: number[];
}

// Forme minimale d'une machine.
export interface BaptemePlaneLike {
    id: string;
    ownerID: string | null;
    operational: boolean;
    classes: number;
}

// Forme minimale d'une demande de baptême.
export interface BaptemeRequestLike {
    status: BaptemeStatusValue;
    expiresAt: Date | string;
}

function toDate(value: Date | string): Date {
    return value instanceof Date ? value : new Date(value);
}

/**
 * Une demande PENDING dont l'échéance est passée est expirée (expiration
 * paresseuse). Les statuts CONFIRMED / REJECTED / EXPIRED sont ignorés (jamais
 * « expirés » au sens du hold — ils ne bloquent plus le créneau).
 */
export function isHoldExpired(req: BaptemeRequestLike, now: Date): boolean {
    if (req.status !== "PENDING") return false;
    return toDate(req.expiresAt).getTime() < now.getTime();
}

/**
 * Y a-t-il un hold actif (une demande PENDING non expirée) parmi ces demandes ?
 * Sert à masquer un créneau déjà « tenu » par un premier client.
 */
export function hasActiveHold(requests: BaptemeRequestLike[], now: Date): boolean {
    return requests.some((r) => r.status === "PENDING" && !isHoldExpired(r, now));
}

/**
 * Machines proposables au public pour un créneau baptême : uniquement les
 * machines DU CLUB (ownerID == null, jamais une machine privée), opérationnelles,
 * effectivement offertes sur le créneau (présentes dans slot.planeID) et
 * compatibles avec les classes autorisées du créneau (si le créneau restreint
 * les classes).
 */
export function filterBaptemePlanes<T extends BaptemePlaneLike>(
    planes: T[],
    slot: Pick<BaptemeSlotLike, "planeID" | "classes">
): T[] {
    return planes.filter(
        (plane) =>
            plane.ownerID == null &&
            plane.operational &&
            slot.planeID.includes(plane.id) &&
            (slot.classes.length === 0 || slot.classes.includes(plane.classes))
    );
}

/**
 * Un créneau est-il proposable au public ? Il faut :
 *  - qu'il soit marqué baptême (natureOfTheft contient DISCOVERY) ;
 *  - qu'il soit libre (studentID == null) ;
 *  - qu'il n'ait aucun hold PENDING actif ;
 *  - qu'il soit dans le futur ;
 *  - qu'au moins une machine club opérationnelle et compatible soit disponible.
 */
export function isBaptemeSlotAvailable(
    slot: BaptemeSlotLike,
    planes: BaptemePlaneLike[],
    requests: BaptemeRequestLike[],
    now: Date
): boolean {
    if (!slot.natureOfTheft.includes(NatureOfTheft.DISCOVERY)) return false;
    if (slot.studentID != null) return false;
    if (toDate(slot.sessionDateStart).getTime() <= now.getTime()) return false;
    if (hasActiveHold(requests, now)) return false;
    return filterBaptemePlanes(planes, slot).length > 0;
}

/**
 * Qui peut valider/refuser une demande de baptême : le pilote assigné au créneau
 * OU un rôle de gestion (président / admin / manager).
 */
export function canValidateBapteme(
    user: { id: string; role: userRole },
    slot: { pilotID: string }
): boolean {
    if (BAPTEME_MANAGEMENT_ROLES.includes(user.role)) return true;
    return user.id === slot.pilotID;
}

/**
 * Qui peut gérer (régénérer) le lien public : admin et président uniquement.
 */
export function canManagePublicLink(role: userRole): boolean {
    return PUBLIC_LINK_MANAGE_ROLES.includes(role);
}

/**
 * Transition de statut d'une demande. Seule une demande PENDING peut évoluer ;
 * toute action sur une demande déjà traitée renvoie une erreur (garde
 * d'idempotence : empêche une double-validation concurrente).
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
