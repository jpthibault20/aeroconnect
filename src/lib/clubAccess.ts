import { userRole } from "@prisma/client";

/**
 * Pure, tested access rules of the "Club" page (/dashboard).
 *
 * The page is open to ALL club members, but its content is filtered:
 *  - everyone sees the club's non-confidential info (contact, hours, booking
 *    rules) and the public discovery-flight booking link;
 *  - only management sees personal / sensitive data (membership requests,
 *    per-instructor / student / plane statistics) and can act on it;
 *  - only the president and admin can change the club configuration and
 *    regenerate the public link (see PUBLIC_LINK_MANAGE_ROLES in lib/bapteme).
 *
 * These helpers are for display only: every server action keeps its own
 * `requireAuth([...])` guard server-side.
 */

// Club management: sees sensitive data and can act on it.
export const CLUB_MANAGEMENT_ROLES: userRole[] = [
    userRole.OWNER,
    userRole.ADMIN,
    userRole.MANAGER,
];

// Club configuration ("Settings" tab): president and admin only.
export const CLUB_SETTINGS_ROLES: userRole[] = [
    userRole.ADMIN,
    userRole.OWNER,
];

/**
 * Can view the club's sensitive data (membership requests, personal statistics)
 * and handle it.
 */
export function canManageClub(role: userRole | undefined | null): boolean {
    return role != null && CLUB_MANAGEMENT_ROLES.includes(role);
}

/**
 * Can edit the club configuration ("Settings" tab).
 */
export function canEditClubSettings(role: userRole | undefined | null): boolean {
    return role != null && CLUB_SETTINGS_ROLES.includes(role);
}

// ─── "Club" page tabs (AER-68) ───

export type ClubTab = "overview" | "todo" | "stats" | "wallet" | "settings";

export const CLUB_TAB_LABELS: Record<ClubTab, string> = {
    overview: "Aperçu",
    todo: "À traiter",
    stats: "Statistiques",
    wallet: "Portefeuilles",
    settings: "Paramètres",
};

/**
 * Visible tabs, in display order. "To handle" also shows for a member with
 * pending assigned discovery flights (list already filtered server-side);
 * "Wallets" requires the wallet to be enabled.
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

/** Tab requested in the URL, or the overview if it is not accessible. */
export function resolveClubTab(requested: string | null | undefined, available: ClubTab[]): ClubTab {
    return available.find((t) => t === requested) ?? "overview";
}

/** Overview to show depending on the role. */
export type OverviewKind = "management" | "instructor" | "pilot" | "member";

export function overviewKindFor(role: userRole | undefined | null): OverviewKind {
    if (canManageClub(role)) return "management";
    if (role === userRole.INSTRUCTOR) return "instructor";
    if (role === userRole.STUDENT || role === userRole.PILOT) return "pilot";
    return "member";
}

// ─── Club switching ───

/**
 * Only an administrator (a role spanning every club) can switch clubs, and only
 * for themselves (navigation club selector). Allowing OWNER / MANAGER would open
 * a multi-tenant escalation: a manager could attach themselves to another club
 * while keeping their role, or move another club's members.
 */
export function canSwitchClub(
    caller: { id: string; role: userRole } | null | undefined,
    targetUserID: string
): boolean {
    return !!caller && caller.role === userRole.ADMIN && caller.id === targetUserID;
}
