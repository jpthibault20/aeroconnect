import { MachineUsage, planes, userRole } from "@prisma/client";

/**
 * Règles de visibilité / propriété des machines.
 *
 * Une machine est soit :
 *  - « du club » : `ownerID == null`. Visible et réservable par tous les
 *    membres du club (sous réserve du filtrage par classe fait ailleurs).
 *  - « privée » : `ownerID != null`. Visible uniquement par son propriétaire,
 *    le président (OWNER) et l'admin (ADMIN). Un élève propriétaire peut donc
 *    la réserver pour ses propres sessions ; les autres membres ne la voient
 *    même pas.
 *
 * « privé » et les usages club (INSTRUCTION / LOCATION / CLUB) sont
 * mutuellement exclusifs : une machine privée a `usageTypes = []`.
 */

// Rôles qui voient TOUTES les machines privées du club, en plus de leurs propres
// machines : président (OWNER) et admin (ADMIN).
const PRIVATE_PLANE_OVERSIGHT_ROLES: userRole[] = [userRole.OWNER, userRole.ADMIN];

// Rôles de gestion, seuls habilités à créer/gérer des machines DU CLUB.
export const CLUB_PLANE_MANAGE_ROLES: userRole[] = [
    userRole.MANAGER,
    userRole.OWNER,
    userRole.ADMIN,
];

// Une machine privée a un propriétaire physique.
export function isPrivatePlane(plane: Pick<planes, "ownerID">): boolean {
    return plane.ownerID != null;
}

// Création : tout membre SAUF le rôle USER de base peut créer une machine privée
// (dont il devient propriétaire). Seuls les rôles de gestion peuvent créer une
// machine DU CLUB.
export function canCreatePrivatePlane(role: userRole): boolean {
    return role !== userRole.USER;
}

export function canCreateClubPlane(role: userRole): boolean {
    return CLUB_PLANE_MANAGE_ROLES.includes(role);
}

// Peut créer au moins un type de machine (utilisé pour afficher le bouton
// « Ajouter »). Équivaut à « pas le rôle USER ».
export function canCreateAnyPlane(role: userRole): boolean {
    return canCreatePrivatePlane(role);
}

// Usages valides pour une machine DU CLUB (une machine privée n'a aucun usage).
export const CLUB_USAGE_VALUES: MachineUsage[] = [
    MachineUsage.INSTRUCTION,
    MachineUsage.LOCATION,
    MachineUsage.CLUB,
];

// Ne conserve que les usages club valides (rejette tout le reste).
export function sanitizeClubUsages(usages: MachineUsage[]): MachineUsage[] {
    return usages.filter((u) => CLUB_USAGE_VALUES.includes(u));
}

export type PlaneKind = "club" | "private";

export interface PlaneCreationResolution {
    ownerID: string | null;
    usageTypes: MachineUsage[];
}

/**
 * Résout le propriétaire + les usages d'une machine à créer selon le rôle du
 * créateur et le type demandé. Fonction pure (le server action fait ensuite la
 * persistance). Règles :
 *  - USER ne peut rien créer ;
 *  - machine du club : réservée aux rôles de gestion, propriétaire = le club
 *    (ownerID null), au moins un usage valide requis ;
 *  - machine privée : propriétaire = le créateur, aucun usage (privé et usages
 *    club sont mutuellement exclusifs).
 */
export function resolvePlaneCreation(
    creator: { id: string; role: userRole },
    kind: PlaneKind,
    requestedUsages: MachineUsage[]
): PlaneCreationResolution | { error: string } {
    if (!canCreatePrivatePlane(creator.role)) {
        return { error: "Permissions insuffisantes" };
    }
    if (kind === "club") {
        if (!canCreateClubPlane(creator.role)) {
            return { error: "Seuls les gestionnaires peuvent créer une machine du club" };
        }
        const usageTypes = sanitizeClubUsages(requestedUsages);
        if (usageTypes.length === 0) {
            return { error: "Sélectionnez au moins un usage pour la machine du club" };
        }
        return { ownerID: null, usageTypes };
    }
    // Machine privée.
    return { ownerID: creator.id, usageTypes: [] };
}

interface Viewer {
    id: string;
    role: userRole;
}

/**
 * Un utilisateur donné peut-il voir cette machine ? (le club est supposé déjà
 * vérifié en amont — on ne filtre ici que la dimension privé/public).
 */
export function canViewPlane(plane: Pick<planes, "ownerID">, user: Viewer): boolean {
    if (!isPrivatePlane(plane)) return true;
    if (plane.ownerID === user.id) return true;
    return PRIVATE_PLANE_OVERSIGHT_ROLES.includes(user.role);
}

/**
 * Un utilisateur peut-il modifier / supprimer cette machine ?
 *  - machine du club : réservé aux rôles de gestion ;
 *  - machine privée : propriétaire, président ou admin.
 */
export function canManagePlane(plane: Pick<planes, "ownerID">, user: Viewer): boolean {
    if (isPrivatePlane(plane)) {
        return plane.ownerID === user.id || PRIVATE_PLANE_OVERSIGHT_ROLES.includes(user.role);
    }
    return CLUB_PLANE_MANAGE_ROLES.includes(user.role);
}

// Rôles qui voient/gèrent la maintenance d'une machine DU CLUB : instructeurs +
// gestion (manager, président, admin). PILOT / STUDENT / USER n'y ont pas accès
// (même s'ils voient la fiche de l'avion).
export const MAINTENANCE_CLUB_ROLES: userRole[] = [
    userRole.INSTRUCTOR,
    userRole.MANAGER,
    userRole.OWNER,
    userRole.ADMIN,
];

/**
 * Accès au suivi de maintenance d'une machine. « Voir = gérer » (décidé avec le
 * client : quiconque voit la section peut aussi ajouter/modifier) :
 *  - machine privée : propriétaire + président (OWNER) + admin (ADMIN) ;
 *  - machine du club : instructeurs + manager + président + admin.
 */
export function canAccessMaintenance(plane: Pick<planes, "ownerID">, user: Viewer): boolean {
    if (isPrivatePlane(plane)) {
        return plane.ownerID === user.id || PRIVATE_PLANE_OVERSIGHT_ROLES.includes(user.role);
    }
    return MAINTENANCE_CLUB_ROLES.includes(user.role);
}

/**
 * Filtre une liste de machines selon la visibilité pour l'utilisateur courant.
 */
export function filterVisiblePlanes<T extends Pick<planes, "ownerID">>(
    list: T[],
    user: Viewer
): T[] {
    return list.filter((plane) => canViewPlane(plane, user));
}

/**
 * Machines réservables par un utilisateur : visibles (club + sa propre privée)
 * ET de l'une de ses classes autorisées. Combine les deux règles utilisées à la
 * réservation (visibilité + classe).
 */
export function filterBookablePlanes<T extends Pick<planes, "ownerID" | "classes">>(
    list: T[],
    user: Viewer & { classes: number[] }
): T[] {
    return filterVisiblePlanes(list, user).filter((plane) => user.classes.includes(plane.classes));
}
