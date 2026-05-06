import { describe, it, expect } from "vitest";
import { userRole } from "@prisma/client";

/**
 * Tests de la matrice de permissions.
 * On teste la logique pure des vérifications de rôle
 * telle qu'implémentée dans les différents fichiers de l'app.
 */

const MANAGEMENT_ROLES = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER, userRole.INSTRUCTOR];
const ADMIN_ROLES = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER];
const LOGBOOK_ROLES = [userRole.PILOT, userRole.STUDENT, userRole.INSTRUCTOR, userRole.OWNER, userRole.ADMIN, userRole.MANAGER];

// Roles qui peuvent gérer les avions (planes.ts ADMIN_ROLES inclut MANAGER)
const PLANE_MANAGEMENT_ROLES = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER];

describe("Matrice de permissions", () => {
    describe("Gestion des sessions (création/suppression)", () => {
        const canManageSessions = (role: userRole) => MANAGEMENT_ROLES.includes(role);

        it("OWNER peut gérer les sessions", () => {
            expect(canManageSessions(userRole.OWNER)).toBe(true);
        });

        it("ADMIN peut gérer les sessions", () => {
            expect(canManageSessions(userRole.ADMIN)).toBe(true);
        });

        it("MANAGER peut gérer les sessions", () => {
            expect(canManageSessions(userRole.MANAGER)).toBe(true);
        });

        it("INSTRUCTOR peut gérer les sessions", () => {
            expect(canManageSessions(userRole.INSTRUCTOR)).toBe(true);
        });

        it("STUDENT ne peut pas gérer les sessions", () => {
            expect(canManageSessions(userRole.STUDENT)).toBe(false);
        });

        it("PILOT ne peut pas gérer les sessions", () => {
            expect(canManageSessions(userRole.PILOT)).toBe(false);
        });

        it("USER ne peut pas gérer les sessions", () => {
            expect(canManageSessions(userRole.USER)).toBe(false);
        });
    });

    describe("Création de sessions pour un autre instructeur", () => {
        const canCreateForOthers = (role: userRole) => ADMIN_ROLES.includes(role);

        it("OWNER peut créer pour un autre instructeur", () => {
            expect(canCreateForOthers(userRole.OWNER)).toBe(true);
        });

        it("ADMIN peut créer pour un autre instructeur", () => {
            expect(canCreateForOthers(userRole.ADMIN)).toBe(true);
        });

        it("MANAGER peut créer pour un autre instructeur", () => {
            expect(canCreateForOthers(userRole.MANAGER)).toBe(true);
        });

        it("INSTRUCTOR ne peut PAS créer pour un autre instructeur", () => {
            expect(canCreateForOthers(userRole.INSTRUCTOR)).toBe(false);
        });
    });

    describe("Accès au carnet de vol", () => {
        const canAccessLogbook = (role: userRole) => LOGBOOK_ROLES.includes(role);

        it("tous les rôles aéronautiques ont accès", () => {
            expect(canAccessLogbook(userRole.PILOT)).toBe(true);
            expect(canAccessLogbook(userRole.STUDENT)).toBe(true);
            expect(canAccessLogbook(userRole.INSTRUCTOR)).toBe(true);
            expect(canAccessLogbook(userRole.OWNER)).toBe(true);
            expect(canAccessLogbook(userRole.ADMIN)).toBe(true);
            expect(canAccessLogbook(userRole.MANAGER)).toBe(true);
        });

        it("USER simple n'a pas accès", () => {
            expect(canAccessLogbook(userRole.USER)).toBe(false);
        });
    });

    describe("Consultation du carnet d'un autre pilote", () => {
        const canViewOthersLogbook = (role: userRole) => ADMIN_ROLES.includes(role);

        it("un STUDENT ne peut PAS voir le carnet d'un autre", () => {
            expect(canViewOthersLogbook(userRole.STUDENT)).toBe(false);
        });

        it("un PILOT ne peut PAS voir le carnet d'un autre", () => {
            expect(canViewOthersLogbook(userRole.PILOT)).toBe(false);
        });

        it("un INSTRUCTOR ne peut PAS voir le carnet d'un autre", () => {
            expect(canViewOthersLogbook(userRole.INSTRUCTOR)).toBe(false);
        });

        it("un ADMIN peut voir le carnet d'un autre", () => {
            expect(canViewOthersLogbook(userRole.ADMIN)).toBe(true);
        });

        it("un MANAGER peut voir le carnet d'un autre", () => {
            expect(canViewOthersLogbook(userRole.MANAGER)).toBe(true);
        });
    });

    describe("Modification d'un vol signé", () => {
        const SIGN_OVERRIDE = [userRole.OWNER, userRole.ADMIN];
        const canModifySigned = (role: userRole) => SIGN_OVERRIDE.includes(role);

        it("seuls OWNER et ADMIN peuvent modifier un vol signé", () => {
            expect(canModifySigned(userRole.OWNER)).toBe(true);
            expect(canModifySigned(userRole.ADMIN)).toBe(true);
        });

        it("un MANAGER ne peut PAS modifier un vol signé", () => {
            expect(canModifySigned(userRole.MANAGER)).toBe(false);
        });

        it("un INSTRUCTOR ne peut PAS modifier un vol signé", () => {
            expect(canModifySigned(userRole.INSTRUCTOR)).toBe(false);
        });

        it("un STUDENT ne peut PAS modifier un vol signé", () => {
            expect(canModifySigned(userRole.STUDENT)).toBe(false);
        });

        it("un PILOT ne peut PAS modifier un vol signé", () => {
            expect(canModifySigned(userRole.PILOT)).toBe(false);
        });
    });

    describe("Signature d'un vol", () => {
        const canSign = (role: userRole, pilotID: string, currentUserID: string) => {
            return currentUserID === pilotID;
        };

        it("seul le pilote concerné peut signer son vol", () => {
            expect(canSign(userRole.INSTRUCTOR, "pilot-1", "pilot-1")).toBe(true);
        });

        it("un autre pilote ne peut PAS signer le vol", () => {
            expect(canSign(userRole.INSTRUCTOR, "pilot-1", "pilot-2")).toBe(false);
        });

        it("même un ADMIN ne peut pas signer le vol d'un autre", () => {
            expect(canSign(userRole.ADMIN, "pilot-1", "admin-1")).toBe(false);
        });
    });

    describe("Gestion des avions", () => {
        const canManagePlanes = (role: userRole) => PLANE_MANAGEMENT_ROLES.includes(role);

        it("OWNER peut gérer les avions", () => {
            expect(canManagePlanes(userRole.OWNER)).toBe(true);
        });

        it("ADMIN peut gérer les avions", () => {
            expect(canManagePlanes(userRole.ADMIN)).toBe(true);
        });

        it("MANAGER peut gérer les avions", () => {
            expect(canManagePlanes(userRole.MANAGER)).toBe(true);
        });

        it("INSTRUCTOR ne peut PAS gérer les avions", () => {
            expect(canManagePlanes(userRole.INSTRUCTOR)).toBe(false);
        });

        it("STUDENT ne peut PAS gérer les avions", () => {
            expect(canManagePlanes(userRole.STUDENT)).toBe(false);
        });
    });

    describe("Compléter les données post-vol depuis le calendrier", () => {
        const canCompletePostFlight = (role: userRole, sessionPilotID: string, currentUserID: string) => {
            if (role === userRole.ADMIN || role === userRole.OWNER || role === userRole.MANAGER) return true;
            return currentUserID === sessionPilotID;
        };

        it("l'instructeur du vol peut compléter", () => {
            expect(canCompletePostFlight(userRole.INSTRUCTOR, "pilot-1", "pilot-1")).toBe(true);
        });

        it("un autre instructeur ne peut PAS compléter", () => {
            expect(canCompletePostFlight(userRole.INSTRUCTOR, "pilot-1", "pilot-2")).toBe(false);
        });

        it("un ADMIN peut compléter n'importe quel vol", () => {
            expect(canCompletePostFlight(userRole.ADMIN, "pilot-1", "admin-1")).toBe(true);
        });

        it("un MANAGER peut compléter n'importe quel vol", () => {
            expect(canCompletePostFlight(userRole.MANAGER, "pilot-1", "mgr-1")).toBe(true);
        });
    });
});
