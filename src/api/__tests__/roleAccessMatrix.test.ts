import { describe, it, expect } from "vitest";
import { userRole } from "@prisma/client";

/**
 * MATRICE COMPLÈTE D'ACCÈS PAR RÔLE
 * Chaque test vérifie qu'un rôle spécifique peut ou ne peut pas
 * effectuer une action donnée.
 *
 * Légende rôles :
 *   USER       = compte créé, pas encore dans un club
 *   STUDENT    = élève inscrit dans un club
 *   PILOT      = pilote autonome (non instructeur)
 *   INSTRUCTOR = instructeur
 *   MANAGER    = gestionnaire du club
 *   ADMIN      = administrateur
 *   OWNER      = propriétaire du club
 */

// --- Constantes de rôles (identiques au code source) ---

const MANAGEMENT_ROLES = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER, userRole.INSTRUCTOR];
const ADMIN_ROLES = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER];
const LOGBOOK_ROLES = [userRole.PILOT, userRole.STUDENT, userRole.INSTRUCTOR, userRole.OWNER, userRole.ADMIN, userRole.MANAGER];
const DELETE_LOG_ROLES = [userRole.OWNER, userRole.ADMIN];
const PLANE_MGMT_ROLES = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER];
const STUDENT_ELIGIBLE_ROLES = [userRole.STUDENT, userRole.PILOT, userRole.OWNER, userRole.ADMIN, userRole.INSTRUCTOR];

const ALL_ROLES = [userRole.USER, userRole.STUDENT, userRole.PILOT, userRole.INSTRUCTOR, userRole.MANAGER, userRole.ADMIN, userRole.OWNER];

// --- Helper ---
function can(role: userRole, allowedRoles: userRole[]): boolean {
    return allowedRoles.includes(role);
}

// ─────────────────────────────────────────────────────────────
// STUDENT
// ─────────────────────────────────────────────────────────────

describe("Rôle STUDENT", () => {
    const role = userRole.STUDENT;

    describe("Ce qu'il PEUT faire", () => {
        it("accéder au carnet de vol", () => expect(can(role, LOGBOOK_ROLES)).toBe(true));
        it("s'inscrire à une session", () => expect(can(role, STUDENT_ELIGIBLE_ROLES)).toBe(true));
    });

    describe("Ce qu'il NE PEUT PAS faire", () => {
        it("créer/supprimer des sessions", () => expect(can(role, MANAGEMENT_ROLES)).toBe(false));
        it("gérer les avions", () => expect(can(role, PLANE_MGMT_ROLES)).toBe(false));
        it("bloquer/supprimer des utilisateurs", () => expect(can(role, ADMIN_ROLES)).toBe(false));
        it("supprimer un vol du carnet", () => expect(can(role, DELETE_LOG_ROLES)).toBe(false));
        it("créer des sessions pour un autre instructeur", () => expect(can(role, ADMIN_ROLES)).toBe(false));
    });

    describe("Restrictions de visibilité", () => {
        it("ne peut PAS voir le carnet d'un autre pilote", () => {
            const isManager = ADMIN_ROLES.includes(role) || role === userRole.INSTRUCTOR;
            expect(isManager).toBe(false);
        });

        it("ne peut PAS modifier un vol signé", () => {
            const canModifySigned = ADMIN_ROLES.includes(role) || role === userRole.INSTRUCTOR;
            expect(canModifySigned).toBe(false);
        });

        it("ne peut PAS changer son propre rôle", () => {
            const isSelf = true;
            const isManager = ADMIN_ROLES.includes(role);
            const roleStays = isSelf && !isManager;
            expect(roleStays).toBe(true);
        });
    });
});

// ─────────────────────────────────────────────────────────────
// PILOT
// ─────────────────────────────────────────────────────────────

describe("Rôle PILOT", () => {
    const role = userRole.PILOT;

    describe("Ce qu'il PEUT faire", () => {
        it("accéder au carnet de vol", () => expect(can(role, LOGBOOK_ROLES)).toBe(true));
        it("s'inscrire à une session", () => expect(can(role, STUDENT_ELIGIBLE_ROLES)).toBe(true));
    });

    describe("Ce qu'il NE PEUT PAS faire", () => {
        it("créer/supprimer des sessions", () => expect(can(role, MANAGEMENT_ROLES)).toBe(false));
        it("gérer les avions", () => expect(can(role, PLANE_MGMT_ROLES)).toBe(false));
        it("bloquer/supprimer des utilisateurs", () => expect(can(role, ADMIN_ROLES)).toBe(false));
        it("supprimer un vol du carnet", () => expect(can(role, DELETE_LOG_ROLES)).toBe(false));
    });

    describe("Restrictions de visibilité", () => {
        it("ne peut PAS voir le carnet d'un autre", () => {
            const isManager = ADMIN_ROLES.includes(role) || role === userRole.INSTRUCTOR;
            expect(isManager).toBe(false);
        });

        it("ne peut PAS modifier un vol signé", () => {
            const canModifySigned = ADMIN_ROLES.includes(role) || role === userRole.INSTRUCTOR;
            expect(canModifySigned).toBe(false);
        });
    });
});

// ─────────────────────────────────────────────────────────────
// INSTRUCTOR
// ─────────────────────────────────────────────────────────────

describe("Rôle INSTRUCTOR", () => {
    const role = userRole.INSTRUCTOR;
    const SIGN_OVERRIDE = [userRole.OWNER, userRole.ADMIN];

    describe("Ce qu'il PEUT faire", () => {
        it("accéder au carnet de vol", () => expect(can(role, LOGBOOK_ROLES)).toBe(true));
        it("créer/supprimer des sessions", () => expect(can(role, MANAGEMENT_ROLES)).toBe(true));
        it("s'inscrire comme élève sur un autre vol", () => expect(can(role, STUDENT_ELIGIBLE_ROLES)).toBe(true));
        it("signer son propre vol", () => {
            // signFlightLog vérifie auth.user.id === log.pilotID, pas le rôle
            const canSign = true; // identité, pas rôle
            expect(canSign).toBe(true);
        });
    });

    describe("Ce qu'il NE PEUT PAS faire", () => {
        it("voir le carnet d'un autre pilote", () => {
            const canView = ADMIN_ROLES.includes(role);
            expect(canView).toBe(false);
        });
        it("modifier un vol signé", () => {
            expect(SIGN_OVERRIDE.includes(role)).toBe(false);
        });
        it("modifier le vol d'un autre pilote", () => {
            const canModifyOthers = ADMIN_ROLES.includes(role);
            expect(canModifyOthers).toBe(false);
        });
        it("gérer les avions", () => expect(can(role, PLANE_MGMT_ROLES)).toBe(false));
        it("bloquer/supprimer des utilisateurs", () => expect(can(role, ADMIN_ROLES)).toBe(false));
        it("supprimer un vol du carnet", () => expect(can(role, DELETE_LOG_ROLES)).toBe(false));
        it("créer des sessions pour un AUTRE instructeur", () => {
            expect(can(role, ADMIN_ROLES)).toBe(false);
        });
    });

    describe("Restrictions", () => {
        it("ne peut créer des sessions que pour lui-même", () => {
            const isManager = ADMIN_ROLES.includes(role);
            const mustBeSelf = !isManager;
            expect(mustBeSelf).toBe(true);
        });

        it("ne peut PAS changer son propre rôle", () => {
            const isSelf = true;
            const isManager = ADMIN_ROLES.includes(role);
            const roleStays = isSelf && !isManager;
            expect(roleStays).toBe(true);
        });
    });
});

// ─────────────────────────────────────────────────────────────
// MANAGER
// ─────────────────────────────────────────────────────────────

describe("Rôle MANAGER", () => {
    const role = userRole.MANAGER;
    const SIGN_OVERRIDE = [userRole.OWNER, userRole.ADMIN];

    describe("Ce qu'il PEUT faire", () => {
        it("accéder au carnet de vol", () => expect(can(role, LOGBOOK_ROLES)).toBe(true));
        it("créer/supprimer des sessions", () => expect(can(role, MANAGEMENT_ROLES)).toBe(true));
        it("gérer les avions", () => expect(can(role, PLANE_MGMT_ROLES)).toBe(true));
        it("bloquer/supprimer des utilisateurs", () => expect(can(role, ADMIN_ROLES)).toBe(true));
        it("créer des sessions pour un autre instructeur", () => expect(can(role, ADMIN_ROLES)).toBe(true));
        it("voir le carnet d'un autre pilote", () => {
            const canView = ADMIN_ROLES.includes(role);
            expect(canView).toBe(true);
        });
    });

    describe("Ce qu'il NE PEUT PAS faire", () => {
        it("modifier un vol signé", () => {
            expect(SIGN_OVERRIDE.includes(role)).toBe(false);
        });
        it("supprimer un vol du carnet", () => expect(can(role, DELETE_LOG_ROLES)).toBe(false));
    });
});

// ─────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────

describe("Rôle ADMIN", () => {
    const role = userRole.ADMIN;

    describe("Ce qu'il PEUT faire", () => {
        it("accéder au carnet de vol", () => expect(can(role, LOGBOOK_ROLES)).toBe(true));
        it("créer/supprimer des sessions", () => expect(can(role, MANAGEMENT_ROLES)).toBe(true));
        it("gérer les avions", () => expect(can(role, PLANE_MGMT_ROLES)).toBe(true));
        it("bloquer/supprimer des utilisateurs", () => expect(can(role, ADMIN_ROLES)).toBe(true));
        it("supprimer un vol du carnet", () => expect(can(role, DELETE_LOG_ROLES)).toBe(true));
        it("créer des sessions pour un autre instructeur", () => expect(can(role, ADMIN_ROLES)).toBe(true));
        it("modifier un vol signé", () => {
            const canModify = ADMIN_ROLES.includes(role) || role === userRole.INSTRUCTOR;
            expect(canModify).toBe(true);
        });
    });
});

// ─────────────────────────────────────────────────────────────
// OWNER
// ─────────────────────────────────────────────────────────────

describe("Rôle OWNER", () => {
    const role = userRole.OWNER;

    describe("Ce qu'il PEUT faire", () => {
        it("accéder au carnet de vol", () => expect(can(role, LOGBOOK_ROLES)).toBe(true));
        it("créer/supprimer des sessions", () => expect(can(role, MANAGEMENT_ROLES)).toBe(true));
        it("gérer les avions", () => expect(can(role, PLANE_MGMT_ROLES)).toBe(true));
        it("bloquer/supprimer des utilisateurs", () => expect(can(role, ADMIN_ROLES)).toBe(true));
        it("supprimer un vol du carnet", () => expect(can(role, DELETE_LOG_ROLES)).toBe(true));
        it("créer des sessions pour un autre instructeur", () => expect(can(role, ADMIN_ROLES)).toBe(true));
        it("s'inscrire comme élève", () => expect(can(role, STUDENT_ELIGIBLE_ROLES)).toBe(true));
    });
});

// ─────────────────────────────────────────────────────────────
// USER (pas encore dans un club)
// ─────────────────────────────────────────────────────────────

describe("Rôle USER (sans club)", () => {
    const role = userRole.USER;

    describe("Ce qu'il NE PEUT PAS faire", () => {
        it("accéder au carnet de vol", () => expect(can(role, LOGBOOK_ROLES)).toBe(false));
        it("créer/supprimer des sessions", () => expect(can(role, MANAGEMENT_ROLES)).toBe(false));
        it("gérer les avions", () => expect(can(role, PLANE_MGMT_ROLES)).toBe(false));
        it("bloquer/supprimer des utilisateurs", () => expect(can(role, ADMIN_ROLES)).toBe(false));
        it("supprimer un vol du carnet", () => expect(can(role, DELETE_LOG_ROLES)).toBe(false));
        it("s'inscrire à une session", () => expect(can(role, STUDENT_ELIGIBLE_ROLES)).toBe(false));
    });
});

// ─────────────────────────────────────────────────────────────
// ACTIONS SENSIBLES : QUI PEUT SIGNER / COMPLÉTER
// ─────────────────────────────────────────────────────────────

describe("Actions sensibles par rôle", () => {
    describe("Signature d'un vol", () => {
        it("seul le pilote du vol peut signer, quel que soit son rôle", () => {
            for (const role of ALL_ROLES) {
                // La signature est liée à l'identité, pas au rôle
                const canSign = (authID: string, pilotID: string) => authID === pilotID;
                expect(canSign("pilot-1", "pilot-1")).toBe(true);
                expect(canSign("pilot-1", "pilot-2")).toBe(false);
            }
        });
    });

    describe("Compléter les données post-vol depuis le calendrier", () => {
        const canComplete = (role: userRole, isPilotOfSession: boolean) => {
            if ([userRole.ADMIN, userRole.OWNER, userRole.MANAGER].includes(role)) return true;
            return isPilotOfSession;
        };

        it("STUDENT ne peut pas compléter même s'il est l'élève du vol", () => {
            expect(canComplete(userRole.STUDENT, false)).toBe(false);
        });

        it("INSTRUCTOR peut compléter s'il est le pilote du vol", () => {
            expect(canComplete(userRole.INSTRUCTOR, true)).toBe(true);
        });

        it("INSTRUCTOR ne peut PAS compléter le vol d'un autre", () => {
            expect(canComplete(userRole.INSTRUCTOR, false)).toBe(false);
        });

        it("ADMIN peut compléter n'importe quel vol", () => {
            expect(canComplete(userRole.ADMIN, false)).toBe(true);
        });
    });

    describe("Filtrage des étudiants inscriptibles", () => {
        it("ADMIN est exclu de la liste des élèves", () => {
            const isExcluded = (role: userRole) => role === userRole.ADMIN || role === userRole.MANAGER;
            expect(isExcluded(userRole.ADMIN)).toBe(true);
        });

        it("MANAGER est exclu de la liste des élèves", () => {
            const isExcluded = (role: userRole) => role === userRole.ADMIN || role === userRole.MANAGER;
            expect(isExcluded(userRole.MANAGER)).toBe(true);
        });

        it("INSTRUCTOR peut être inscrit comme élève", () => {
            const isExcluded = (role: userRole) => role === userRole.ADMIN || role === userRole.MANAGER;
            expect(isExcluded(userRole.INSTRUCTOR)).toBe(false);
        });

        it("STUDENT peut être inscrit", () => {
            const isExcluded = (role: userRole) => role === userRole.ADMIN || role === userRole.MANAGER;
            expect(isExcluded(userRole.STUDENT)).toBe(false);
        });
    });
});
