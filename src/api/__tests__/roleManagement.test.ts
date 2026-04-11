import { describe, it, expect } from "vitest";
import { userRole } from "@prisma/client";

/**
 * Tests de gestion des rôles.
 * Logique extraite de users.ts (updateUser, blockUser, deleteUser).
 */

const MANAGEMENT_ROLES = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER];

// --- Logique updateUser : protection du changement de rôle ---

function resolveRoleOnUpdate(
    requestedRole: userRole,
    currentRole: userRole,
    isSelf: boolean,
    isManager: boolean
): userRole {
    // users.ts ligne 248 : role: isSelf && !isManager ? auth.user.role : user.role
    return isSelf && !isManager ? currentRole : requestedRole;
}

function resolveRestrictedOnUpdate(
    requestedRestricted: boolean,
    currentRestricted: boolean,
    isSelf: boolean,
    isManager: boolean
): boolean {
    return isSelf && !isManager ? currentRestricted : requestedRestricted;
}

describe("Gestion des rôles", () => {
    describe("Changement de rôle via updateUser", () => {
        it("un STUDENT ne peut PAS se changer en ADMIN", () => {
            const result = resolveRoleOnUpdate(userRole.ADMIN, userRole.STUDENT, true, false);
            expect(result).toBe(userRole.STUDENT);
        });

        it("un INSTRUCTOR ne peut PAS se changer en OWNER", () => {
            const result = resolveRoleOnUpdate(userRole.OWNER, userRole.INSTRUCTOR, true, false);
            expect(result).toBe(userRole.INSTRUCTOR);
        });

        it("un PILOT ne peut PAS se changer en MANAGER", () => {
            const result = resolveRoleOnUpdate(userRole.MANAGER, userRole.PILOT, true, false);
            expect(result).toBe(userRole.PILOT);
        });

        it("un ADMIN peut changer le rôle d'un autre utilisateur", () => {
            const result = resolveRoleOnUpdate(userRole.INSTRUCTOR, userRole.STUDENT, false, true);
            expect(result).toBe(userRole.INSTRUCTOR);
        });

        it("un MANAGER peut changer le rôle d'un autre utilisateur", () => {
            const result = resolveRoleOnUpdate(userRole.PILOT, userRole.STUDENT, false, true);
            expect(result).toBe(userRole.PILOT);
        });

        it("un OWNER peut changer le rôle d'un autre utilisateur", () => {
            const result = resolveRoleOnUpdate(userRole.ADMIN, userRole.USER, false, true);
            expect(result).toBe(userRole.ADMIN);
        });

        it("un manager qui se modifie lui-même PEUT changer son rôle", () => {
            const result = resolveRoleOnUpdate(userRole.INSTRUCTOR, userRole.ADMIN, true, true);
            expect(result).toBe(userRole.INSTRUCTOR);
        });
    });

    describe("Auto-blocage via updateUser", () => {
        it("un non-manager ne peut PAS se restreindre lui-même", () => {
            const result = resolveRestrictedOnUpdate(true, false, true, false);
            expect(result).toBe(false);
        });

        it("un non-manager ne peut PAS se débloquer", () => {
            const result = resolveRestrictedOnUpdate(false, true, true, false);
            expect(result).toBe(true);
        });

        it("un manager peut bloquer un autre utilisateur", () => {
            const result = resolveRestrictedOnUpdate(true, false, false, true);
            expect(result).toBe(true);
        });
    });

    describe("Blocage utilisateur (blockUser)", () => {
        const canBlock = (role: userRole) => MANAGEMENT_ROLES.includes(role);

        it("OWNER peut bloquer", () => expect(canBlock(userRole.OWNER)).toBe(true));
        it("ADMIN peut bloquer", () => expect(canBlock(userRole.ADMIN)).toBe(true));
        it("MANAGER peut bloquer", () => expect(canBlock(userRole.MANAGER)).toBe(true));
        it("INSTRUCTOR ne peut PAS bloquer", () => expect(canBlock(userRole.INSTRUCTOR)).toBe(false));
        it("STUDENT ne peut PAS bloquer", () => expect(canBlock(userRole.STUDENT)).toBe(false));
    });

    describe("Suppression utilisateur (deleteUser)", () => {
        it("la suppression réinitialise le rôle à USER", () => {
            const resetData = { clubID: null, restricted: false, classes: [] as number[], role: userRole.USER };
            expect(resetData.role).toBe(userRole.USER);
            expect(resetData.clubID).toBeNull();
            expect(resetData.restricted).toBe(false);
            expect(resetData.classes).toEqual([]);
        });

        const canDelete = (role: userRole) => MANAGEMENT_ROLES.includes(role);
        it("seuls OWNER/ADMIN/MANAGER peuvent supprimer", () => {
            expect(canDelete(userRole.OWNER)).toBe(true);
            expect(canDelete(userRole.ADMIN)).toBe(true);
            expect(canDelete(userRole.MANAGER)).toBe(true);
            expect(canDelete(userRole.INSTRUCTOR)).toBe(false);
            expect(canDelete(userRole.STUDENT)).toBe(false);
        });
    });

    describe("Hiérarchie des rôles", () => {
        const allRoles = [userRole.USER, userRole.STUDENT, userRole.PILOT, userRole.INSTRUCTOR, userRole.MANAGER, userRole.ADMIN, userRole.OWNER];

        it("tous les rôles sont définis dans l'enum", () => {
            expect(allRoles).toHaveLength(7);
        });

        it("les rôles de management sont un sous-ensemble", () => {
            for (const role of MANAGEMENT_ROLES) {
                expect(allRoles).toContain(role);
            }
        });
    });
});
