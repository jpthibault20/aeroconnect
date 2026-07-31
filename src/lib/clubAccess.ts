import { userRole } from "@prisma/client";

/**
 * Règles (pures, testées) d'accès à la page « Club » (/dashboard).
 *
 * La page est ouverte à TOUS les membres du club, mais son contenu est filtré :
 *  - tout le monde voit les informations non confidentielles du club (contact,
 *    horaires, règles de réservation) et le lien public de réservation baptême ;
 *  - seule la gestion voit les données nominatives / sensibles (demandes
 *    d'adhésion, statistiques par instructeur / élève / machine) et peut agir ;
 *  - seuls président et admin peuvent modifier la configuration du club et
 *    régénérer le lien public (cf. PUBLIC_LINK_MANAGE_ROLES dans lib/bapteme).
 *
 * Ces helpers ne servent qu'à l'affichage : chaque server action garde sa
 * propre garde `requireAuth([...])` côté serveur.
 */

// Gestion du club : voit les données sensibles et peut agir dessus.
export const CLUB_MANAGEMENT_ROLES: userRole[] = [
    userRole.OWNER,
    userRole.ADMIN,
    userRole.MANAGER,
];

// Configuration du club (onglet « Paramètres ») : président et admin seulement.
export const CLUB_SETTINGS_ROLES: userRole[] = [
    userRole.ADMIN,
    userRole.OWNER,
];

/**
 * Peut consulter les données sensibles du club (demandes d'adhésion,
 * statistiques nominatives) et les traiter.
 */
export function canManageClub(role: userRole | undefined | null): boolean {
    return role != null && CLUB_MANAGEMENT_ROLES.includes(role);
}

/**
 * Peut modifier la configuration du club (onglet « Paramètres »).
 */
export function canEditClubSettings(role: userRole | undefined | null): boolean {
    return role != null && CLUB_SETTINGS_ROLES.includes(role);
}
