import { describe, it, expect } from "vitest";
import { userRole } from "@prisma/client";
import {
    canViewPlane,
    canManagePlane,
    filterVisiblePlanes,
    canCreatePrivatePlane,
    canCreateClubPlane,
    canCreateAnyPlane,
    canEditPlaneHobbs,
    isPrivatePlane,
} from "@/lib/planeVisibility";
import {
    canAccessLogbookPage,
    canManageLogbook,
    canAddManualLogEntry,
    canSeeAircraftLogbook,
    isLogbookReadOnly,
} from "@/lib/logbookPermissions";

/**
 * ROLE CAPABILITY MATRIX: Planes & Logbook.
 *
 * Organized by role (what each role CAN / CANNOT do) and imports the REAL
 * permission functions (no "mirror" constants), so a rule change breaks the test.
 *
 * Scope: capabilities introduced/affected by the "member planes" ticket:
 *  - plane creation (private vs club);
 *  - plane visibility & management (private = owner + OWNER/ADMIN);
 *  - logbook access + manual entry (STUDENT no, PILOT yes).
 *
 * NOT duplicated here (covered elsewhere):
 *  - session management/creation, booking eligibility → roleAccessMatrix / permissions
 *  - plane filtering by student class → businessRules
 *  - viewing another pilot's logbook, signature=identity, editing a signed flight → permissions
 *  - generic cross-club isolation → clubIsolation
 */

const CLUB = "club-1";
const OTHER_CLUB = "club-2";

const user = (role: userRole, id = "me", clubID = CLUB) => ({ id, role, clubID });

// Reference planes (same club unless stated otherwise).
const clubPlane = { ownerID: null, clubID: CLUB };
const myPrivatePlane = { ownerID: "me", clubID: CLUB };
const othersPrivatePlane = { ownerID: "someone-else", clubID: CLUB };

// Mirrors how the server actions compose: clubID filter THEN visibility filter
// (see getPlanes / getAllPlanesOperational).
function visiblePlanesInClub<T extends { ownerID: string | null; clubID: string }>(
    all: T[],
    u: { id: string; role: userRole; clubID: string }
): T[] {
    return filterVisiblePlanes(all.filter((p) => p.clubID === u.clubID), u);
}

const ALL_ROLES = [
    userRole.USER, userRole.STUDENT, userRole.PILOT, userRole.INSTRUCTOR,
    userRole.MANAGER, userRole.ADMIN, userRole.OWNER,
];

// ─────────────────────────────────────────────────────────────
// USER (base account, no real club access)
// ─────────────────────────────────────────────────────────────

describe("Rôle USER", () => {
    const role: userRole = userRole.USER;

    it("ne peut créer AUCUNE machine (ni privée, ni club)", () => {
        expect(canCreatePrivatePlane(role)).toBe(false);
        expect(canCreateClubPlane(role)).toBe(false);
        expect(canCreateAnyPlane(role)).toBe(false);
    });

    it("ne peut gérer aucune machine (il n'en possède aucune : USER ne crée rien)", () => {
        // A USER never owns a plane (they cannot create one), so it is tested as a
        // non-owner.
        const nonOwner = user(role, "user-x");
        expect(canManagePlane(clubPlane, nonOwner)).toBe(false);
        expect(canManagePlane(othersPrivatePlane, nonOwner)).toBe(false);
        expect(canViewPlane(othersPrivatePlane, nonOwner)).toBe(false);
    });

    it("n'a pas accès au carnet de vol (ni saisie)", () => {
        expect(canAccessLogbookPage(role)).toBe(false);
        expect(canAddManualLogEntry(role)).toBe(false);
        expect(canManageLogbook(role)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────
// STUDENT
// ─────────────────────────────────────────────────────────────

describe("Rôle STUDENT", () => {
    const role: userRole = userRole.STUDENT;

    it("peut créer une machine privée mais PAS une machine du club", () => {
        expect(canCreatePrivatePlane(role)).toBe(true);
        expect(canCreateClubPlane(role)).toBe(false);
    });

    it("gère sa propre machine privée, pas celle des autres ni le club", () => {
        expect(canManagePlane(myPrivatePlane, user(role))).toBe(true);
        expect(canManagePlane(othersPrivatePlane, user(role))).toBe(false);
        expect(canManagePlane(clubPlane, user(role))).toBe(false);
    });

    it("voit les machines du club + la sienne, pas la privée d'un autre", () => {
        const visible = visiblePlanesInClub(
            [clubPlane, myPrivatePlane, othersPrivatePlane],
            user(role)
        );
        expect(visible).toContain(clubPlane);
        expect(visible).toContain(myPrivatePlane);
        expect(visible).not.toContain(othersPrivatePlane);
    });

    it("accède au carnet en LECTURE SEULE et ne fait PAS de saisie manuelle", () => {
        // A student always flies with an instructor: the flight is auto-logged, they
        // neither enter nor sign it. Only the instructor signs.
        expect(canAccessLogbookPage(role)).toBe(true);
        expect(isLogbookReadOnly(role)).toBe(true);
        expect(canAddManualLogEntry(role)).toBe(false);
        expect(canSeeAircraftLogbook(role)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────
// PILOT
// ─────────────────────────────────────────────────────────────

describe("Rôle PILOT", () => {
    const role: userRole = userRole.PILOT;

    it("peut créer une machine privée mais PAS une machine du club", () => {
        expect(canCreatePrivatePlane(role)).toBe(true);
        expect(canCreateClubPlane(role)).toBe(false);
    });

    it("gère sa propre machine privée (et peut voler sur les machines du club)", () => {
        expect(canManagePlane(myPrivatePlane, user(role))).toBe(true);
        expect(canManagePlane(othersPrivatePlane, user(role))).toBe(false);
        // A club plane is visible/bookable by the pilot.
        expect(canViewPlane(clubPlane, user(role))).toBe(true);
    });

    it("accède au carnet ET peut faire des saisies manuelles (son propre carnet)", () => {
        expect(canAccessLogbookPage(role)).toBe(true);
        expect(canAddManualLogEntry(role)).toBe(true);
        expect(isLogbookReadOnly(role)).toBe(false);
    });

    it("ne gère pas le carnet des autres ni le carnet de route machine", () => {
        expect(canManageLogbook(role)).toBe(false);
        expect(canSeeAircraftLogbook(role)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────
// INSTRUCTOR
// ─────────────────────────────────────────────────────────────

describe("Rôle INSTRUCTOR", () => {
    const role: userRole = userRole.INSTRUCTOR;

    it("peut créer une machine privée mais PAS une machine du club", () => {
        expect(canCreatePrivatePlane(role)).toBe(true);
        expect(canCreateClubPlane(role)).toBe(false);
    });

    it("gère sa propre machine privée, mais PAS la privée d'un autre", () => {
        // Like a pilot: they manage the planes they fly solo (their own). They do not
        // supervise other people's private planes.
        expect(canManagePlane(myPrivatePlane, user(role))).toBe(true);
        expect(canManagePlane(othersPrivatePlane, user(role))).toBe(false);
        expect(canViewPlane(othersPrivatePlane, user(role))).toBe(false);
    });

    it("accède au carnet, saisie manuelle et carnet de route machine", () => {
        expect(canAccessLogbookPage(role)).toBe(true);
        expect(canAddManualLogEntry(role)).toBe(true);
        expect(canManageLogbook(role)).toBe(true);
        expect(canSeeAircraftLogbook(role)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────
// MANAGER
// ─────────────────────────────────────────────────────────────

describe("Rôle MANAGER", () => {
    const role: userRole = userRole.MANAGER;

    it("peut créer des machines du club ET des machines privées", () => {
        expect(canCreateClubPlane(role)).toBe(true);
        expect(canCreatePrivatePlane(role)).toBe(true);
    });

    it("gère les machines du club et les siennes, mais PAS la privée d'un autre", () => {
        expect(canManagePlane(clubPlane, user(role))).toBe(true);
        expect(canManagePlane(myPrivatePlane, user(role))).toBe(true);
        expect(canManagePlane(othersPrivatePlane, user(role))).toBe(false);
        // The manager is not one of the private-plane supervision roles.
        expect(canViewPlane(othersPrivatePlane, user(role))).toBe(false);
    });

    it("gère le carnet (saisie, carnet de route machine)", () => {
        expect(canManageLogbook(role)).toBe(true);
        expect(canAddManualLogEntry(role)).toBe(true);
        expect(canSeeAircraftLogbook(role)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────
// OWNER (president)
// ─────────────────────────────────────────────────────────────

describe("Rôle OWNER (président)", () => {
    const role: userRole = userRole.OWNER;

    it("peut créer machines du club et privées", () => {
        expect(canCreateClubPlane(role)).toBe(true);
        expect(canCreatePrivatePlane(role)).toBe(true);
    });

    it("voit et gère TOUTES les machines, y compris les privées des autres", () => {
        expect(canViewPlane(othersPrivatePlane, user(role))).toBe(true);
        expect(canManagePlane(othersPrivatePlane, user(role))).toBe(true);
        expect(canManagePlane(clubPlane, user(role))).toBe(true);
    });

    it("gère intégralement le carnet", () => {
        expect(canManageLogbook(role)).toBe(true);
        expect(canAddManualLogEntry(role)).toBe(true);
        expect(canSeeAircraftLogbook(role)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────

describe("Rôle ADMIN", () => {
    const role: userRole = userRole.ADMIN;

    it("voit et gère TOUTES les machines, y compris les privées des autres", () => {
        expect(canViewPlane(othersPrivatePlane, user(role))).toBe(true);
        expect(canManagePlane(othersPrivatePlane, user(role))).toBe(true);
        expect(canManagePlane(clubPlane, user(role))).toBe(true);
    });

    it("peut créer machines du club et privées, et gère le carnet", () => {
        expect(canCreateClubPlane(role)).toBe(true);
        expect(canCreatePrivatePlane(role)).toBe(true);
        expect(canManageLogbook(role)).toBe(true);
        expect(canAddManualLogEntry(role)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────
// GENERAL (cross-cutting) TESTS
// ─────────────────────────────────────────────────────────────

describe("Général — visibilité des machines privées", () => {
    it("une machine privée n'est visible QUE par son propriétaire, le président et l'admin", () => {
        const owner = user(userRole.STUDENT, "me");
        // Owner: yes.
        expect(canViewPlane(myPrivatePlane, owner)).toBe(true);
        // President / admin: yes (supervision).
        expect(canViewPlane(myPrivatePlane, user(userRole.OWNER, "pres"))).toBe(true);
        expect(canViewPlane(myPrivatePlane, user(userRole.ADMIN, "adm"))).toBe(true);
        // Every other role (non-owner): no.
        for (const role of [userRole.USER, userRole.STUDENT, userRole.PILOT, userRole.INSTRUCTOR, userRole.MANAGER]) {
            expect(canViewPlane(myPrivatePlane, user(role, "autre"))).toBe(false);
        }
    });

    it("une machine du club est visible par tous les rôles du club", () => {
        for (const role of ALL_ROLES) {
            expect(canViewPlane(clubPlane, user(role, "x"))).toBe(true);
        }
    });

    it("isPrivatePlane distingue club (ownerID null) et privée", () => {
        expect(isPrivatePlane(clubPlane)).toBe(false);
        expect(isPrivatePlane(myPrivatePlane)).toBe(true);
    });
});

describe("Général — correction du compteur horaire (hobbsTotal)", () => {
    it("le propriétaire d'une machine privée peut corriger le compteur de SA machine", () => {
        // Including a student: it is their plane, they read its counter.
        expect(canEditPlaneHobbs(myPrivatePlane, user(userRole.STUDENT, "me"))).toBe(true);
        expect(canEditPlaneHobbs(myPrivatePlane, user(userRole.PILOT, "me"))).toBe(true);
    });

    it("le propriétaire ne peut PAS corriger le compteur d'une machine du club", () => {
        for (const role of [userRole.STUDENT, userRole.PILOT, userRole.INSTRUCTOR, userRole.MANAGER]) {
            expect(canEditPlaneHobbs(clubPlane, user(role))).toBe(false);
        }
    });

    it("personne ne corrige le compteur de la machine privée d'un autre, sauf président/admin", () => {
        for (const role of [userRole.USER, userRole.STUDENT, userRole.PILOT, userRole.INSTRUCTOR, userRole.MANAGER]) {
            expect(canEditPlaneHobbs(othersPrivatePlane, user(role))).toBe(false);
        }
        expect(canEditPlaneHobbs(othersPrivatePlane, user(userRole.OWNER))).toBe(true);
        expect(canEditPlaneHobbs(othersPrivatePlane, user(userRole.ADMIN))).toBe(true);
    });

    it("président et admin corrigent le compteur de n'importe quelle machine", () => {
        for (const role of [userRole.OWNER, userRole.ADMIN]) {
            expect(canEditPlaneHobbs(clubPlane, user(role))).toBe(true);
            expect(canEditPlaneHobbs(myPrivatePlane, user(role))).toBe(true);
        }
    });
});

describe("Général — isolation inter-clubs", () => {
    it("aucun rôle ne voit les machines d'un autre club (même une machine du club)", () => {
        const foreignClubPlane = { ownerID: null, clubID: OTHER_CLUB };
        const foreignPrivatePlane = { ownerID: "me", clubID: OTHER_CLUB };
        for (const role of ALL_ROLES) {
            // Even club-1's president/admin sees nothing from club-2 through this list.
            const visible = visiblePlanesInClub(
                [clubPlane, foreignClubPlane, foreignPrivatePlane],
                user(role, "me", CLUB)
            );
            expect(visible).not.toContain(foreignClubPlane);
            expect(visible).not.toContain(foreignPrivatePlane);
        }
    });

    it("le propriétaire d'une machine ne la voit pas s'il change de club", () => {
        const myPlaneInClub1 = { ownerID: "me", clubID: CLUB };
        const meInClub2 = user(userRole.STUDENT, "me", OTHER_CLUB);
        const visible = visiblePlanesInClub([myPlaneInClub1], meInClub2);
        expect(visible).toHaveLength(0);
    });
});

// ─────────────────────────────────────────────────────────────
// Plane logbook: student owner access
// ─────────────────────────────────────────────────────────────

describe("Carnet de route machine (onglet 'Carnet de Vol Machine')", () => {
    it("un élève SANS machine privée n'a pas accès à l'onglet", () => {
        expect(canSeeAircraftLogbook(userRole.STUDENT)).toBe(false);
        expect(canSeeAircraftLogbook(userRole.STUDENT, { ownsPrivatePlane: false })).toBe(false);
    });

    it("un élève propriétaire d'une machine privée y a accès (en lecture seule)", () => {
        expect(canSeeAircraftLogbook(userRole.STUDENT, { ownsPrivatePlane: true })).toBe(true);
        // ... but stays read-only (no editing/signing).
        expect(isLogbookReadOnly(userRole.STUDENT)).toBe(true);
    });

    it("les rôles de gestion y ont toujours accès et NE sont PAS en lecture seule", () => {
        for (const role of [userRole.INSTRUCTOR, userRole.MANAGER, userRole.OWNER, userRole.ADMIN]) {
            expect(canSeeAircraftLogbook(role)).toBe(true);
            expect(isLogbookReadOnly(role)).toBe(false);
        }
    });

    it("un PILOT n'accède à l'onglet que s'il possède une machine privée", () => {
        expect(canSeeAircraftLogbook(userRole.PILOT)).toBe(false);
        expect(canSeeAircraftLogbook(userRole.PILOT, { ownsPrivatePlane: true })).toBe(true);
    });
});
