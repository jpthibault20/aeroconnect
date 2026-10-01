import { userRole } from "@prisma/client";

/**
 * Logbook permissions, factored into pure functions shared by the server, the
 * client components and the tests (avoids drift between code and "mirror" tests).
 *
 * Product reminders:
 *  - A STUDENT always flies with an instructor: their flights are auto-logged
 *    calendar sessions. They do NOT enter flights manually and do NOT sign (only
 *    the instructor signs). They view their logbook read-only.
 *  - A PILOT manages their own logbook (manual entries, signing their flights)
 *    but not other people's flights nor the plane logbook.
 *  - Management roles (INSTRUCTOR/MANAGER/OWNER/ADMIN) go beyond that.
 */

// "Logbook management" roles: see/manage beyond their own logbook (plane logbook
// tab, pilot selector, other people's flights).
export const LOGBOOK_MANAGE_ROLES: userRole[] = [
    userRole.OWNER,
    userRole.ADMIN,
    userRole.MANAGER,
    userRole.INSTRUCTOR,
];

// Roles with access to the /logbook page (nav + page guard).
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

// Who can create a manual logbook entry: management roles + PILOT (for their own
// logbook). NOT STUDENT (always flies with an instructor).
export function canAddManualLogEntry(role: userRole | undefined): boolean {
    return canManageLogbook(role) || role === userRole.PILOT;
}

// The "plane logbook" tab: management roles only, OR a member owning at least one
// private plane (to view THEIR plane's logbook, read-only if not management).
export function canSeeAircraftLogbook(
    role: userRole | undefined,
    opts?: { ownsPrivatePlane?: boolean }
): boolean {
    return canManageLogbook(role) || !!opts?.ownsPrivatePlane;
}

// The pilot selector (viewing someone else's logbook) stays management only.
export function canSelectAnyPilot(role: userRole | undefined): boolean {
    return canManageLogbook(role);
}

// Students are read-only (no editing, no signing, "Signed" column hidden).
export function isLogbookReadOnly(role: userRole | undefined): boolean {
    return role === userRole.STUDENT;
}
