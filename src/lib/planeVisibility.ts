import { MachineUsage, planes, userRole } from "@prisma/client";

/**
 * Plane visibility / ownership rules.
 *
 * A plane is either:
 *  - "club": `ownerID == null`. Visible and bookable by every club member
 *    (subject to class filtering done elsewhere).
 *  - "private": `ownerID != null`. Only visible to its owner, the president
 *    (OWNER) and the admin (ADMIN). A student owner can therefore book it for
 *    their own sessions; other members do not even see it.
 *
 * "Private" and the club usages (INSTRUCTION / LOCATION / CLUB) are mutually
 * exclusive: a private plane has `usageTypes = []`.
 */

// Roles that see ALL the club's private planes, on top of their own: president
// (OWNER) and admin (ADMIN). They are also the only roles allowed to reassign a
// plane's owner (see canReassignPlaneOwner).
export const PRIVATE_PLANE_OVERSIGHT_ROLES: userRole[] = [userRole.OWNER, userRole.ADMIN];

// Management roles, the only ones allowed to create/manage CLUB planes.
export const CLUB_PLANE_MANAGE_ROLES: userRole[] = [
    userRole.MANAGER,
    userRole.OWNER,
    userRole.ADMIN,
];

// A private plane has a physical owner.
export function isPrivatePlane(plane: Pick<planes, "ownerID">): boolean {
    return plane.ownerID != null;
}

// Creation: any member EXCEPT the base USER role can create a private plane
// (which they own). Only management roles can create a CLUB plane.
export function canCreatePrivatePlane(role: userRole): boolean {
    return role !== userRole.USER;
}

export function canCreateClubPlane(role: userRole): boolean {
    return CLUB_PLANE_MANAGE_ROLES.includes(role);
}

// Can create at least one kind of plane (used to show the "Add" button).
// Equivalent to "not the USER role".
export function canCreateAnyPlane(role: userRole): boolean {
    return canCreatePrivatePlane(role);
}

// Valid usages for a CLUB plane (a private plane has no usage).
export const CLUB_USAGE_VALUES: MachineUsage[] = [
    MachineUsage.INSTRUCTION,
    MachineUsage.LOCATION,
    MachineUsage.CLUB,
];

// Keeps only valid club usages (rejects everything else).
export function sanitizeClubUsages(usages: MachineUsage[]): MachineUsage[] {
    return usages.filter((u) => CLUB_USAGE_VALUES.includes(u));
}

export type PlaneKind = "club" | "private";

export interface PlaneCreationResolution {
    ownerID: string | null;
    usageTypes: MachineUsage[];
}

/**
 * Resolves the owner + usages of a plane to create from the creator's role and
 * the requested kind. Pure (the server action then persists). Rules:
 *  - USER cannot create anything;
 *  - club plane: management roles only, owner = the club (ownerID null), at
 *    least one valid usage required;
 *  - private plane: owner = the creator, no usage (private and club usages are
 *    mutually exclusive).
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
    // Private plane.
    return { ownerID: creator.id, usageTypes: [] };
}

interface Viewer {
    id: string;
    role: userRole;
}

// Only the president and the admin can reassign a plane's owner (to a club
// member, or to the club = ownerID null).
export function canReassignPlaneOwner(user: Viewer): boolean {
    return PRIVATE_PLANE_OVERSIGHT_ROLES.includes(user.role);
}

export interface OwnerReassignment {
    ownerID: string | null;
    usageTypes: MachineUsage[];
}

/**
 * Resolves owner + usages on a reassignment (president/admin only). Same
 * exclusivity rules as resolvePlaneCreation:
 *  - new owner = a member => private plane, no club usage;
 *  - new owner = null => club plane, keeping the existing usages (when it was
 *    already a club plane), or all usages by default if it was private (it had
 *    none).
 */
export function resolveOwnerReassignment(
    newOwnerID: string | null,
    currentUsageTypes: MachineUsage[]
): OwnerReassignment {
    if (newOwnerID) {
        return { ownerID: newOwnerID, usageTypes: [] };
    }
    const usageTypes = sanitizeClubUsages(currentUsageTypes);
    return { ownerID: null, usageTypes: usageTypes.length > 0 ? usageTypes : CLUB_USAGE_VALUES };
}

/**
 * Can a given user see this plane? (the club is assumed already checked
 * upstream; only the private/public dimension is filtered here).
 */
export function canViewPlane(plane: Pick<planes, "ownerID">, user: Viewer): boolean {
    if (!isPrivatePlane(plane)) return true;
    if (plane.ownerID === user.id) return true;
    return PRIVATE_PLANE_OVERSIGHT_ROLES.includes(user.role);
}

/**
 * Can a user edit / delete this plane?
 *  - club plane: management roles only;
 *  - private plane: owner, president or admin.
 */
export function canManagePlane(plane: Pick<planes, "ownerID">, user: Viewer): boolean {
    if (isPrivatePlane(plane)) {
        return plane.ownerID === user.id || PRIVATE_PLANE_OVERSIGHT_ROLES.includes(user.role);
    }
    return CLUB_PLANE_MANAGE_ROLES.includes(user.role);
}

/**
 * Can a user correct this plane's Hobbs counter (hobbsTotal) from its form?
 *  - club plane: president (OWNER) and admin (ADMIN) only;
 *  - private plane: its owner, plus the president and the admin.
 *
 * The counter normally advances by itself when a flight is signed (see
 * signFlightLog): this edit is a manual correction, hence the warning shown in
 * the form.
 */
export function canEditPlaneHobbs(plane: Pick<planes, "ownerID">, user: Viewer): boolean {
    if (PRIVATE_PLANE_OVERSIGHT_ROLES.includes(user.role)) return true;
    return isPrivatePlane(plane) && plane.ownerID === user.id;
}

// Roles that see/manage a CLUB plane's maintenance: instructors + management
// (manager, president, admin). PILOT / STUDENT / USER have no access (even though
// they see the plane's card).
export const MAINTENANCE_CLUB_ROLES: userRole[] = [
    userRole.INSTRUCTOR,
    userRole.MANAGER,
    userRole.OWNER,
    userRole.ADMIN,
];

/**
 * Access to a plane's maintenance tracking. "View = manage" (agreed with the
 * client: anyone who sees the section can also add/edit):
 *  - private plane: owner + president (OWNER) + admin (ADMIN);
 *  - club plane: instructors + manager + president + admin.
 */
export function canAccessMaintenance(plane: Pick<planes, "ownerID">, user: Viewer): boolean {
    if (isPrivatePlane(plane)) {
        return plane.ownerID === user.id || PRIVATE_PLANE_OVERSIGHT_ROLES.includes(user.role);
    }
    return MAINTENANCE_CLUB_ROLES.includes(user.role);
}

/**
 * Filters a list of planes by visibility for the current user.
 */
export function filterVisiblePlanes<T extends Pick<planes, "ownerID">>(
    list: T[],
    user: Viewer
): T[] {
    return list.filter((plane) => canViewPlane(plane, user));
}

/**
 * Planes bookable by a user: visible (club + their own private one) AND of one of
 * their allowed classes. Combines the two booking rules (visibility + class).
 */
export function filterBookablePlanes<T extends Pick<planes, "ownerID" | "classes">>(
    list: T[],
    user: Viewer & { classes: number[] }
): T[] {
    return filterVisiblePlanes(list, user).filter((plane) => user.classes.includes(plane.classes));
}

/**
 * Marker stored in `flight_sessions.planeID`, like the `"classroomSession"`
 * marker already in that array: means "every CLUB plane", resolved dynamically
 * on read rather than frozen at creation.
 *
 * Without it, a slot (let alone a recurring series over several months) created
 * with "Select all" never offered a plane created afterwards: `planeID` was a
 * snapshot of the planes existing at creation, never updated. See
 * resolveOfferedPlaneIDs / resolveOfferedClasses.
 */
export const ALL_CLUB_PLANES_SENTINEL = "allClubPlanes";

/**
 * Resolves the planes actually offered by a slot: replaces the
 * `ALL_CLUB_PLANES_SENTINEL` marker (if present) with the current list of CLUB
 * planes (never a private plane), keeping the other entries as is (notably
 * `"classroomSession"`).
 *
 * A `planeID` without the marker (slot where the instructor deliberately picked
 * a subset of planes) is never changed: only the "all planes" selection must
 * follow the addition of new planes.
 */
export function resolveOfferedPlaneIDs<T extends Pick<planes, "id" | "ownerID">>(
    planeIDField: string[],
    clubPlanes: T[]
): string[] {
    if (!planeIDField.includes(ALL_CLUB_PLANES_SENTINEL)) return planeIDField;

    const clubPlaneIDs = clubPlanes.filter((p) => !isPrivatePlane(p)).map((p) => p.id);
    const explicitExtras = planeIDField.filter((id) => id !== ALL_CLUB_PLANES_SENTINEL);
    return Array.from(new Set([...clubPlaneIDs, ...explicitExtras]));
}

/**
 * Resolves the classes actually covered by a slot. Same logic as
 * resolveOfferedPlaneIDs: if the slot carries the "all planes" marker, the
 * classes dynamically follow the existing CLUB planes rather than staying frozen
 * on those present at creation.
 */
export function resolveOfferedClasses<T extends Pick<planes, "classes" | "ownerID">>(
    planeIDField: string[],
    classesField: number[],
    clubPlanes: T[]
): number[] {
    if (!planeIDField.includes(ALL_CLUB_PLANES_SENTINEL)) return classesField;
    return Array.from(new Set(clubPlanes.filter((p) => !isPrivatePlane(p)).map((p) => p.classes)));
}

/**
 * Is a given plane offered by this slot? Handy for one-off `.includes(...)`
 * checks (SessionPopup) without rebuilding the full list.
 */
export function sessionOffersPlane<T extends Pick<planes, "id" | "ownerID">>(
    planeIDField: string[],
    planeID: string,
    clubPlanes: T[]
): boolean {
    return resolveOfferedPlaneIDs(planeIDField, clubPlanes).includes(planeID);
}

export interface BeneficiaryPlaneScope {
    // Planes offered on the slot (flight_sessions.planeID): what the instructor made
    // available.
    offeredPlaneIDs: string[];
    // Planes already taken by another booking at the same time.
    unavailablePlaneIDs?: string[];
}

/**
 * Planes bookable FOR THE BENEFICIARY of a flight (the booked student), on a
 * given slot.
 *
 * The list is computed from the point of view of the one who will fly, never the
 * one entering it: a manager booking a student over the phone must see THAT
 * student's planes, not their own. This is already the server-side rule (see
 * canViewPlane in studentRegistration).
 *
 * Two sources add up:
 *  - the CLUB planes offered on the slot (the instructor picks which ones they
 *    make available);
 *  - the beneficiary's PRIVATE planes, which do not need to be "offered" by the
 *    slot: they own them.
 *
 * In both cases the beneficiary's class is required: owning a plane does not
 * exempt from being rated on it.
 */
export function filterPlanesForBeneficiary<T extends Pick<planes, "id" | "ownerID" | "classes">>(
    list: T[],
    beneficiary: Viewer & { classes: number[] },
    scope: BeneficiaryPlaneScope
): T[] {
    const unavailable = new Set(scope.unavailablePlaneIDs ?? []);
    return list.filter((plane) => {
        if (unavailable.has(plane.id)) return false;
        if (!beneficiary.classes.includes(plane.classes)) return false;
        // Beneficiary's plane: always available.
        if (isPrivatePlane(plane) && plane.ownerID === beneficiary.id) return true;
        // Otherwise: plane visible to them AND made available on the slot.
        return canViewPlane(plane, beneficiary) && scope.offeredPlaneIDs.includes(plane.id);
    });
}

export interface FlightLogParticipants {
    // User entering the flight.
    actor: Viewer;
    // Flight's pilot (the one entering it, or the targeted pilot in delegated entry).
    pilotID: string;
    // Flight's student (instruction flight entered by the instructor), if any.
    studentID?: string | null;
}

/**
 * Can a plane be put on a logbook entry?
 *  - club plane: yes;
 *  - private plane: only if it belongs to the flight's pilot or student.
 *    President (OWNER) and admin (ADMIN), who supervise every private plane, can
 *    pick any of them.
 *
 * Same rule in the UI (offered list) and server-side (createFlightLog).
 */
export function canLogFlightOnPlane(
    plane: Pick<planes, "ownerID">,
    { actor, pilotID, studentID }: FlightLogParticipants
): boolean {
    if (!isPrivatePlane(plane)) return true;
    if (PRIVATE_PLANE_OVERSIGHT_ROLES.includes(actor.role)) return true;
    return plane.ownerID === pilotID || (!!studentID && plane.ownerID === studentID);
}
