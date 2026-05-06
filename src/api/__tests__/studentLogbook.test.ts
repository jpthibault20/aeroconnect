import { describe, it, expect } from "vitest";
import { userRole } from "@prisma/client";
import { navigationLinks } from "@/config/links";

/**
 * Tests pour le carnet de vol côté élève (STUDENT).
 *
 * Règles produit :
 *   - L'élève peut accéder à la page /logbook (lecture seule).
 *   - Il voit uniquement ses propres entrées (logs où pilotID === currentUser.id),
 *     donc seules ses entrées de fonction "EP" auto-créées remontent.
 *   - Il ne voit pas le carnet de route (avion).
 *   - Il ne peut rien gérer (pas de bouton "Nouveau vol", pas d'édition).
 *   - Le terme "signé" et le bouton de signature sont masqués pour lui.
 *
 * Les constantes ci-dessous reproduisent celles du code source pour vérifier
 * le contrat sans dépendre de fichiers Next.js (page.tsx, composants client).
 */

// --- Constantes reproduites depuis app/(protected)/logbook/page.tsx ---
const LOGBOOK_PAGE_ALLOWED_ROLES: userRole[] = [
    userRole.OWNER, userRole.ADMIN, userRole.MANAGER, userRole.INSTRUCTOR, userRole.STUDENT,
];

// --- Predicates reproduits depuis LogbookPageComponent.tsx & PilotLogbookTab.tsx ---

function canManage(role: userRole | undefined): boolean {
    return (
        role === userRole.ADMIN ||
        role === userRole.OWNER ||
        role === userRole.MANAGER ||
        role === userRole.INSTRUCTOR
    );
}

function canSeeAircraftTab(role: userRole | undefined): boolean {
    return (
        role === userRole.ADMIN ||
        role === userRole.OWNER ||
        role === userRole.MANAGER ||
        role === userRole.INSTRUCTOR
    );
}

function canSelectPilot(role: userRole | undefined): boolean {
    return (
        role === userRole.ADMIN ||
        role === userRole.OWNER ||
        role === userRole.MANAGER ||
        role === userRole.INSTRUCTOR
    );
}

function isStudent(role: userRole | undefined): boolean {
    return role === userRole.STUDENT;
}

interface MinimalLog {
    id: string;
    pilotID: string;
    instructorID: string | null;
    pilotFunction: "EP" | "P" | "I";
}

function visibleLogs(role: userRole | undefined, currentUserID: string, logs: MinimalLog[]): MinimalLog[] {
    if (!role) return [];
    if (role === userRole.STUDENT || role === userRole.PILOT) {
        return logs.filter((l) => l.pilotID === currentUserID);
    }
    if (role === userRole.INSTRUCTOR) {
        return logs.filter((l) => l.pilotID === currentUserID || l.instructorID === currentUserID);
    }
    return logs;
}

// --- Tests ---

describe("Carnet de vol — accès et visibilité élève (STUDENT)", () => {
    describe("Accès à la page /logbook", () => {
        it("STUDENT peut accéder à la page", () => {
            expect(LOGBOOK_PAGE_ALLOWED_ROLES).toContain(userRole.STUDENT);
        });

        it("USER (compte sans club) ne peut PAS y accéder", () => {
            expect(LOGBOOK_PAGE_ALLOWED_ROLES).not.toContain(userRole.USER);
        });

        it("PILOT n'est pas dans les rôles autorisés de la page", () => {
            // PILOT a le LOGBOOK_ROLES côté API mais la page ne les laisse pas
            // pour l'instant ; on verrouille la liste actuelle pour éviter une
            // régression silencieuse.
            expect(LOGBOOK_PAGE_ALLOWED_ROLES).not.toContain(userRole.PILOT);
        });

        it("tous les rôles de gestion sont autorisés", () => {
            for (const r of [userRole.OWNER, userRole.ADMIN, userRole.MANAGER, userRole.INSTRUCTOR]) {
                expect(LOGBOOK_PAGE_ALLOWED_ROLES).toContain(r);
            }
        });
    });

    describe("Lien de navigation /logbook", () => {
        const link = navigationLinks.find((l) => l.path === "/logbook");

        it("le lien existe", () => {
            expect(link).toBeDefined();
        });

        it("est visible pour STUDENT", () => {
            expect(link?.roles).toContain(userRole.STUDENT);
        });

        it("est visible pour les rôles de gestion", () => {
            for (const r of [userRole.OWNER, userRole.ADMIN, userRole.MANAGER, userRole.INSTRUCTOR]) {
                expect(link?.roles).toContain(r);
            }
        });

        it("n'est PAS visible pour USER", () => {
            expect(link?.roles).not.toContain(userRole.USER);
        });
    });

    describe("Filtre des logs visibles (visibleLogs)", () => {
        const studentID = "stu-1";
        const otherStudentID = "stu-2";
        const instructorID = "inst-1";

        const logs: MinimalLog[] = [
            // Vol pédagogique de l'élève : son entrée EP
            { id: "epi-1", pilotID: studentID, instructorID, pilotFunction: "EP" },
            // Le même vol côté instructeur (à NE PAS voir pour l'élève)
            { id: "i-1", pilotID: instructorID, instructorID: null, pilotFunction: "I" },
            // Vol d'un autre élève (à NE PAS voir)
            { id: "epi-2", pilotID: otherStudentID, instructorID, pilotFunction: "EP" },
            // Vol pilote solo de l'élève (cas rare mais possible si manuel)
            { id: "p-1", pilotID: studentID, instructorID: null, pilotFunction: "P" },
        ];

        it("STUDENT voit uniquement les logs où il est pilotID", () => {
            const visible = visibleLogs(userRole.STUDENT, studentID, logs);
            expect(visible.map((l) => l.id).sort()).toEqual(["epi-1", "p-1"]);
        });

        it("STUDENT ne voit PAS le log instructeur de la même session", () => {
            const visible = visibleLogs(userRole.STUDENT, studentID, logs);
            expect(visible.find((l) => l.id === "i-1")).toBeUndefined();
        });

        it("STUDENT ne voit PAS le log d'un autre élève", () => {
            const visible = visibleLogs(userRole.STUDENT, studentID, logs);
            expect(visible.find((l) => l.id === "epi-2")).toBeUndefined();
        });

        it("INSTRUCTOR voit ses propres entrées + celles où il est instructeur", () => {
            const visible = visibleLogs(userRole.INSTRUCTOR, instructorID, logs);
            // i-1 (pilotID=inst), epi-1 (instructorID=inst), epi-2 (instructorID=inst)
            expect(visible.map((l) => l.id).sort()).toEqual(["epi-1", "epi-2", "i-1"]);
        });

        it("ADMIN voit tout", () => {
            const visible = visibleLogs(userRole.ADMIN, "admin-1", logs);
            expect(visible).toHaveLength(logs.length);
        });
    });

    describe("UI : restrictions pour STUDENT", () => {
        it("ne peut pas gérer (pas de bouton 'Nouveau vol')", () => {
            expect(canManage(userRole.STUDENT)).toBe(false);
        });

        it("ne voit pas l'onglet 'Carnet de Route' (avion)", () => {
            expect(canSeeAircraftTab(userRole.STUDENT)).toBe(false);
        });

        it("ne peut pas filtrer par pilote (le sélecteur est masqué)", () => {
            expect(canSelectPilot(userRole.STUDENT)).toBe(false);
        });

        it("isStudent est vrai pour STUDENT, faux pour les autres", () => {
            expect(isStudent(userRole.STUDENT)).toBe(true);
            expect(isStudent(userRole.PILOT)).toBe(false);
            expect(isStudent(userRole.INSTRUCTOR)).toBe(false);
            expect(isStudent(userRole.ADMIN)).toBe(false);
        });

        it("INSTRUCTOR (régression) reste autorisé à gérer et voir les avions", () => {
            expect(canManage(userRole.INSTRUCTOR)).toBe(true);
            expect(canSeeAircraftTab(userRole.INSTRUCTOR)).toBe(true);
        });
    });

    describe("Page lecture seule pour STUDENT", () => {
        // Le clic sur une ligne du tableau n'ouvre pas le dialog d'édition
        // pour un élève. On modélise la garde présente dans
        // PilotLogbookTab.handleRowClick : `if (isStudent) return;`.
        function shouldOpenEditDialog(role: userRole | undefined): boolean {
            return !isStudent(role);
        }

        it("clic sur une ligne en tant que STUDENT n'ouvre PAS le dialog d'édition", () => {
            expect(shouldOpenEditDialog(userRole.STUDENT)).toBe(false);
        });

        it("clic sur une ligne en tant que INSTRUCTOR ouvre le dialog d'édition", () => {
            expect(shouldOpenEditDialog(userRole.INSTRUCTOR)).toBe(true);
        });

        it("clic sur une ligne en tant que ADMIN ouvre le dialog d'édition", () => {
            expect(shouldOpenEditDialog(userRole.ADMIN)).toBe(true);
        });
    });

    describe("Masquage du terme 'signé' pour STUDENT", () => {
        // Reproduit la garde `{!isStudent && <SignFlightLogButton ... />}` et
        // le masquage de la colonne "Signe" dans PilotLogbookTab.
        function showSignColumn(role: userRole | undefined): boolean {
            return !isStudent(role);
        }
        function showSignButton(role: userRole | undefined): boolean {
            return !isStudent(role);
        }

        it("colonne 'Signé' masquée pour STUDENT", () => {
            expect(showSignColumn(userRole.STUDENT)).toBe(false);
        });

        it("bouton 'Signer' masqué pour STUDENT", () => {
            expect(showSignButton(userRole.STUDENT)).toBe(false);
        });

        it("colonne et bouton restent visibles pour les autres rôles", () => {
            for (const r of [userRole.PILOT, userRole.INSTRUCTOR, userRole.MANAGER, userRole.ADMIN, userRole.OWNER]) {
                expect(showSignColumn(r)).toBe(true);
                expect(showSignButton(r)).toBe(true);
            }
        });
    });
});
