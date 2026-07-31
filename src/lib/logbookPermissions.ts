import { userRole } from "@prisma/client";

/**
 * Permissions du carnet de vol, factorisées en fonctions pures pour être
 * partagées entre le serveur, les composants client et les tests (évite la
 * dérive entre le code et les tests « miroir »).
 *
 * Rappels produit :
 *  - L'élève (STUDENT) vole toujours avec un instructeur : ses vols sont des
 *    sessions du calendrier auto-loguées. Il NE fait PAS de saisie manuelle et
 *    ne signe PAS (seul l'instructeur signe). Il consulte son carnet en lecture
 *    seule.
 *  - Le PILOT gère son propre carnet (saisies manuelles, signature de ses vols)
 *    mais ne gère pas les vols des autres ni le carnet de route machine.
 *  - Les rôles de gestion (INSTRUCTOR/MANAGER/OWNER/ADMIN) gèrent au-delà.
 */

// Rôles « gestion carnet » : voient/gèrent au-delà de leur propre carnet
// (onglet carnet de route machine, sélecteur de pilote, vols des autres).
export const LOGBOOK_MANAGE_ROLES: userRole[] = [
    userRole.OWNER,
    userRole.ADMIN,
    userRole.MANAGER,
    userRole.INSTRUCTOR,
];

// Rôles ayant accès à la page /logbook (nav + garde de page).
export const LOGBOOK_PAGE_ROLES: userRole[] = [
    userRole.OWNER,
    userRole.ADMIN,
    userRole.MANAGER,
    userRole.INSTRUCTOR,
    userRole.STUDENT,
    userRole.PILOT,
];

export function canManageLogbook(role: userRole | undefined): boolean {
    return !!role && LOGBOOK_MANAGE_ROLES.includes(role);
}

export function canAccessLogbookPage(role: userRole | undefined): boolean {
    return !!role && LOGBOOK_PAGE_ROLES.includes(role);
}

// Qui peut créer une entrée manuelle de carnet : les rôles de gestion + le
// PILOT (pour son propre carnet). PAS le STUDENT (vol toujours avec instructeur).
export function canAddManualLogEntry(role: userRole | undefined): boolean {
    return canManageLogbook(role) || role === userRole.PILOT;
}

// L'onglet « carnet de route machine » : réservé aux rôles de gestion, OU à un
// membre propriétaire d'au moins une machine privée (pour consulter le carnet de
// route de SA machine — en lecture seule s'il n'est pas gestionnaire).
export function canSeeAircraftLogbook(
    role: userRole | undefined,
    opts?: { ownsPrivatePlane?: boolean }
): boolean {
    return canManageLogbook(role) || !!opts?.ownsPrivatePlane;
}

// Le sélecteur de pilote (voir le carnet d'un autre) reste réservé aux gestions.
export function canSelectAnyPilot(role: userRole | undefined): boolean {
    return canManageLogbook(role);
}

// L'élève est en lecture seule (pas d'édition, pas de signature, colonne
// « Signé » masquée).
export function isLogbookReadOnly(role: userRole | undefined): boolean {
    return role === userRole.STUDENT;
}

// La popup automatique « vols à signer » (PendingFlightsPrompt) ne doit
// s'ouvrir que pour quelqu'un qui peut effectivement compléter et signer. Un
// rôle en lecture seule n'y verrait qu'un mur : ses vols restent consultables
// dans la page carnet.
export function shouldPromptToSignFlights(role: userRole | undefined): boolean {
    return canAccessLogbookPage(role) && !isLogbookReadOnly(role);
}
