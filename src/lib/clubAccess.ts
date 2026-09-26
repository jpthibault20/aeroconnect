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

// ─── Onglets de la page « Club » (AER-68) ───

export type ClubTab = "overview" | "todo" | "stats" | "wallet" | "settings";

export const CLUB_TAB_LABELS: Record<ClubTab, string> = {
    overview: "Aperçu",
    todo: "À traiter",
    stats: "Statistiques",
    wallet: "Portefeuilles",
    settings: "Paramètres",
};

/**
 * Onglets visibles, dans l'ordre d'affichage. « À traiter » apparaît aussi
 * pour un membre qui a des baptêmes assignés en attente (liste déjà filtrée
 * côté serveur) ; « Portefeuilles » exige le portefeuille activé.
 */
export function clubTabsFor(
    role: userRole | undefined | null,
    opts: { walletEnabled: boolean; hasPendingBaptemes: boolean }
): ClubTab[] {
    const management = canManageClub(role);
    const tabs: ClubTab[] = ["overview"];
    if (management || opts.hasPendingBaptemes) tabs.push("todo");
    if (management) tabs.push("stats");
    if (management && opts.walletEnabled) tabs.push("wallet");
    if (canEditClubSettings(role)) tabs.push("settings");
    return tabs;
}

/** Onglet demandé dans l'URL, ou l'aperçu s'il n'est pas accessible. */
export function resolveClubTab(requested: string | null | undefined, available: ClubTab[]): ClubTab {
    return available.find((t) => t === requested) ?? "overview";
}

/** Aperçu à afficher selon le rôle. */
export type OverviewKind = "management" | "instructor" | "pilot" | "member";

export function overviewKindFor(role: userRole | undefined | null): OverviewKind {
    if (canManageClub(role)) return "management";
    if (role === userRole.INSTRUCTOR) return "instructor";
    if (role === userRole.STUDENT || role === userRole.PILOT) return "pilot";
    return "member";
}
