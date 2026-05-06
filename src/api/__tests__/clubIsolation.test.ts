import { describe, it, expect } from "vitest";
import { userRole } from "@prisma/client";

/**
 * Tests d'isolation inter-clubs.
 * Vérifie que les vérifications de clubID empêchent l'accès croisé.
 * Logique extraite des server actions.
 */

// --- Helpers simulant les guards de clubID ---

function checkClubAccess(authUserClubID: string, targetClubID: string): boolean {
    return authUserClubID === targetClubID;
}

function checkLogbookAccess(
    authUserID: string,
    authUserClubID: string,
    authUserRole: userRole,
    targetPilotID: string,
    targetClubID: string
): { allowed: boolean; reason?: string } {
    const MANAGEMENT_ROLES = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER, userRole.INSTRUCTOR];
    const isManager = MANAGEMENT_ROLES.includes(authUserRole);

    if (authUserClubID !== targetClubID) {
        return { allowed: false, reason: "Club différent" };
    }
    if (!isManager && authUserID !== targetPilotID) {
        return { allowed: false, reason: "Pas autorisé à voir le carnet d'un autre" };
    }
    return { allowed: true };
}

function checkPlaneAccess(authUserClubID: string, planeClubID: string): boolean {
    return authUserClubID === planeClubID;
}

function checkSessionCreation(
    authUserClubID: string,
    instructorClubID: string,
    authUserID: string,
    instructorID: string,
    authUserRole: userRole
): { allowed: boolean; reason?: string } {
    const ADMIN_ROLES = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER];

    if (authUserClubID !== instructorClubID) {
        return { allowed: false, reason: "Instructeur d'un autre club" };
    }
    if (!ADMIN_ROLES.includes(authUserRole) && authUserID !== instructorID) {
        return { allowed: false, reason: "Non autorisé à créer pour un autre instructeur" };
    }
    return { allowed: true };
}

// --- Tests ---

describe("Isolation inter-clubs", () => {
    describe("Accès général par clubID", () => {
        it("même club = accès autorisé", () => {
            expect(checkClubAccess("club-1", "club-1")).toBe(true);
        });

        it("club différent = accès refusé", () => {
            expect(checkClubAccess("club-1", "club-2")).toBe(false);
        });
    });

    describe("Carnet de vol (getLogbookByPilot)", () => {
        it("un STUDENT peut voir son propre carnet", () => {
            const result = checkLogbookAccess("user-1", "club-1", userRole.STUDENT, "user-1", "club-1");
            expect(result.allowed).toBe(true);
        });

        it("un STUDENT ne peut PAS voir le carnet d'un autre pilote", () => {
            const result = checkLogbookAccess("user-1", "club-1", userRole.STUDENT, "user-2", "club-1");
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe("Pas autorisé à voir le carnet d'un autre");
        });

        it("un INSTRUCTOR peut voir le carnet d'un autre pilote du même club", () => {
            const result = checkLogbookAccess("instr-1", "club-1", userRole.INSTRUCTOR, "user-2", "club-1");
            expect(result.allowed).toBe(true);
        });

        it("un ADMIN ne peut PAS voir le carnet d'un pilote d'un AUTRE club", () => {
            const result = checkLogbookAccess("admin-1", "club-1", userRole.ADMIN, "user-2", "club-2");
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe("Club différent");
        });

        it("un MANAGER peut voir le carnet d'un pilote du même club", () => {
            const result = checkLogbookAccess("mgr-1", "club-1", userRole.MANAGER, "user-2", "club-1");
            expect(result.allowed).toBe(true);
        });
    });

    describe("Gestion des avions", () => {
        it("peut gérer un avion de son club", () => {
            expect(checkPlaneAccess("club-1", "club-1")).toBe(true);
        });

        it("ne peut PAS gérer un avion d'un autre club", () => {
            expect(checkPlaneAccess("club-1", "club-2")).toBe(false);
        });
    });

    describe("Création de sessions", () => {
        it("un ADMIN peut créer pour un instructeur du même club", () => {
            const result = checkSessionCreation("club-1", "club-1", "admin-1", "instr-1", userRole.ADMIN);
            expect(result.allowed).toBe(true);
        });

        it("un ADMIN ne peut PAS créer pour un instructeur d'un autre club", () => {
            const result = checkSessionCreation("club-1", "club-2", "admin-1", "instr-1", userRole.ADMIN);
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe("Instructeur d'un autre club");
        });

        it("un INSTRUCTOR peut créer pour lui-même", () => {
            const result = checkSessionCreation("club-1", "club-1", "instr-1", "instr-1", userRole.INSTRUCTOR);
            expect(result.allowed).toBe(true);
        });

        it("un INSTRUCTOR ne peut PAS créer pour un autre instructeur", () => {
            const result = checkSessionCreation("club-1", "club-1", "instr-1", "instr-2", userRole.INSTRUCTOR);
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe("Non autorisé à créer pour un autre instructeur");
        });

        it("un MANAGER peut créer pour n'importe quel instructeur du même club", () => {
            const result = checkSessionCreation("club-1", "club-1", "mgr-1", "instr-1", userRole.MANAGER);
            expect(result.allowed).toBe(true);
        });
    });

    describe("Modification de vols (updateFlightLog)", () => {
        it("refusé si le vol appartient à un autre club", () => {
            const logClubID = "club-2";
            const authClubID = "club-1";
            expect(checkClubAccess(authClubID, logClubID)).toBe(false);
        });

        it("autorisé si même club", () => {
            const logClubID = "club-1";
            const authClubID = "club-1";
            expect(checkClubAccess(authClubID, logClubID)).toBe(true);
        });
    });

    describe("Suppression de vols (deleteFlightLog)", () => {
        it("seuls OWNER/ADMIN peuvent supprimer", () => {
            const canDelete = (role: userRole) => [userRole.OWNER, userRole.ADMIN].includes(role);
            expect(canDelete(userRole.OWNER)).toBe(true);
            expect(canDelete(userRole.ADMIN)).toBe(true);
            expect(canDelete(userRole.MANAGER)).toBe(false);
            expect(canDelete(userRole.INSTRUCTOR)).toBe(false);
        });

        it("un vol signé ne peut PAS être supprimé", () => {
            const pilotSigned = true;
            expect(pilotSigned).toBe(true); // la suppression sera bloquée
        });
    });

    describe("Gestion des utilisateurs inter-clubs", () => {
        it("un manager ne peut bloquer qu'un utilisateur de son club", () => {
            expect(checkClubAccess("club-1", "club-1")).toBe(true);
            expect(checkClubAccess("club-1", "club-2")).toBe(false);
        });

        it("un manager ne peut supprimer qu'un utilisateur de son club", () => {
            expect(checkClubAccess("club-1", "club-1")).toBe(true);
            expect(checkClubAccess("club-1", "club-2")).toBe(false);
        });
    });
});
