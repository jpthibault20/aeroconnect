import { describe, it, expect } from "vitest";
import { userRole } from "@prisma/client";
import { navigationLinks } from "@/config/links";
import { LOGBOOK_PAGE_ROLES, canSeeAircraftLogbook } from "@/lib/logbookPermissions";

/**
 * Student (STUDENT) side of the logbook.
 *
 * Product rules:
 *   - The student can open /logbook (read-only).
 *   - They only see their own entries (logs where pilotID === currentUser.id),
 *     so only their auto-created "EP" entries show up.
 *   - They do not see the plane logbook.
 *   - They cannot manage anything (no "New flight" button, no editing).
 *   - The "signed" wording and the sign button are hidden for them.
 *
 * The constants below mirror the source code to check the contract without
 * depending on Next.js files (page.tsx, client components).
 */

// Roles allowed on /logbook, imported from the real code (single source).
const LOGBOOK_PAGE_ALLOWED_ROLES: userRole[] = LOGBOOK_PAGE_ROLES;

// --- Predicates mirrored from LogbookPageComponent.tsx & PilotLogbookTab.tsx ---

function canManage(role: userRole | undefined): boolean {
    return (
        role === userRole.ADMIN ||
        role === userRole.OWNER ||
        role === userRole.MANAGER ||
        role === userRole.INSTRUCTOR
    );
}

// Plane logbook tab: relies on the real code. Without a private plane (the
// default here) only a management role has access. The "student owning a
// private plane" case is covered in roleCapabilities.test.ts.
function canSeeAircraftTab(role: userRole | undefined): boolean {
    return canSeeAircraftLogbook(role);
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

        it("PILOT a désormais accès à la page (saisies manuelles de son carnet)", () => {
            expect(LOGBOOK_PAGE_ALLOWED_ROLES).toContain(userRole.PILOT);
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
            // Student's training flight: their EP entry
            { id: "epi-1", pilotID: studentID, instructorID, pilotFunction: "EP" },
            // Same flight on the instructor side (must NOT be visible to the student)
            { id: "i-1", pilotID: instructorID, instructorID: null, pilotFunction: "I" },
            // Another student's flight (must NOT be visible)
            { id: "epi-2", pilotID: otherStudentID, instructorID, pilotFunction: "EP" },
            // Student's solo pilot flight (rare, but possible if entered manually)
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

        it("sans machine privée, ne voit pas l'onglet 'Carnet de Route' (avion)", () => {
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
        // Clicking a table row does not open the edit dialog for a student. Models the
        // guard in PilotLogbookTab.handleRowClick: `if (isStudent) return;`.
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
        // Mirrors the `{!isStudent && <SignFlightLogButton ... />}` guard and the hidden
        // "Signed" column in PilotLogbookTab.
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
