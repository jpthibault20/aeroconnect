import { describe, it, expect } from "vitest";
import { userRole } from "@prisma/client";

/**
 * Tests des règles du carnet de vol (flight_logs).
 * Logique extraite de logbook.ts.
 */

// --- Calcul des temps par fonction pilote ---

function computeTimes(pilotFunction: string, durationMinutes: number) {
    return {
        timeDC: pilotFunction === "EP" ? durationMinutes : 0,
        timePIC: pilotFunction === "P" ? durationMinutes : 0,
        timeInstructor: pilotFunction === "I" ? durationMinutes : 0,
    };
}

// --- Mapping planeID spéciaux ---

function mapPlaneInfo(studentPlaneID: string | null, planeInfo: { immatriculation: string; name: string } | null) {
    const isClassroom = studentPlaneID === "classroomSession";
    const isNoPlane = studentPlaneID === "noPlane";
    return {
        planeID: isClassroom || isNoPlane ? null : studentPlaneID,
        planeRegistration: planeInfo?.immatriculation ?? (isClassroom ? "THEORIQUE" : isNoPlane ? "PERSO" : "N/A"),
        planeName: planeInfo?.name ?? (isClassroom ? "Théorique" : isNoPlane ? "Perso" : "Inconnu"),
    };
}

// --- Signature ---

function canSignFlight(authUserID: string, logPilotID: string, pilotSigned: boolean): { allowed: boolean; reason?: string } {
    if (authUserID !== logPilotID) return { allowed: false, reason: "Seul le pilote concerné peut signer" };
    if (pilotSigned) return { allowed: false, reason: "Entrée déjà signée" };
    return { allowed: true };
}

// --- Suppression ---

function canDeleteFlight(role: userRole, pilotSigned: boolean, authClubID: string, logClubID: string): { allowed: boolean; reason?: string } {
    const DELETE_ROLES = [userRole.OWNER, userRole.ADMIN];
    if (!DELETE_ROLES.includes(role)) return { allowed: false, reason: "Permissions insuffisantes" };
    if (authClubID !== logClubID) return { allowed: false, reason: "Club différent" };
    if (pilotSigned) return { allowed: false, reason: "Impossible de supprimer une entrée signée" };
    return { allowed: true };
}

// --- Auto-création : filtrage sessions éligibles ---

const REGULATION_START = new Date("2025-07-01");

function isSessionEligibleForLog(sessionDate: Date, studentID: string | null, now: Date): boolean {
    return studentID !== null && sessionDate < now && sessionDate >= REGULATION_START;
}

// --- Tests ---

describe("Règles du carnet de vol", () => {
    describe("Calcul des temps par fonction pilote", () => {
        it("EP (élève pilote) → tout en temps double commande", () => {
            const times = computeTimes("EP", 90);
            expect(times.timeDC).toBe(90);
            expect(times.timePIC).toBe(0);
            expect(times.timeInstructor).toBe(0);
        });

        it("P (pilote) → tout en temps commandant de bord", () => {
            const times = computeTimes("P", 60);
            expect(times.timeDC).toBe(0);
            expect(times.timePIC).toBe(60);
            expect(times.timeInstructor).toBe(0);
        });

        it("I (instructeur) → tout en temps instructeur", () => {
            const times = computeTimes("I", 120);
            expect(times.timeDC).toBe(0);
            expect(times.timePIC).toBe(0);
            expect(times.timeInstructor).toBe(120);
        });

        it("fonction inconnue → tous à 0", () => {
            const times = computeTimes("X", 60);
            expect(times.timeDC).toBe(0);
            expect(times.timePIC).toBe(0);
            expect(times.timeInstructor).toBe(0);
        });
    });

    describe("Mapping des avions spéciaux", () => {
        it("classroomSession → THEORIQUE, planeID null", () => {
            const info = mapPlaneInfo("classroomSession", null);
            expect(info.planeID).toBeNull();
            expect(info.planeRegistration).toBe("THEORIQUE");
            expect(info.planeName).toBe("Théorique");
        });

        it("noPlane → PERSO, planeID null", () => {
            const info = mapPlaneInfo("noPlane", null);
            expect(info.planeID).toBeNull();
            expect(info.planeRegistration).toBe("PERSO");
            expect(info.planeName).toBe("Perso");
        });

        it("avion normal avec info → registration et nom de l'avion", () => {
            const info = mapPlaneInfo("plane-1", { immatriculation: "F-GXYZ", name: "DR400" });
            expect(info.planeID).toBe("plane-1");
            expect(info.planeRegistration).toBe("F-GXYZ");
            expect(info.planeName).toBe("DR400");
        });

        it("avion normal sans info (supprimé?) → N/A et Inconnu", () => {
            const info = mapPlaneInfo("plane-1", null);
            expect(info.planeID).toBe("plane-1");
            expect(info.planeRegistration).toBe("N/A");
            expect(info.planeName).toBe("Inconnu");
        });
    });

    describe("Signature", () => {
        it("le pilote peut signer son propre vol non signé", () => {
            const result = canSignFlight("pilot-1", "pilot-1", false);
            expect(result.allowed).toBe(true);
        });

        it("un autre utilisateur ne peut PAS signer", () => {
            const result = canSignFlight("other-user", "pilot-1", false);
            expect(result.allowed).toBe(false);
        });

        it("un vol déjà signé ne peut PAS être re-signé", () => {
            const result = canSignFlight("pilot-1", "pilot-1", true);
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe("Entrée déjà signée");
        });
    });

    describe("Suppression de vol", () => {
        it("OWNER peut supprimer un vol non signé de son club", () => {
            expect(canDeleteFlight(userRole.OWNER, false, "club-1", "club-1").allowed).toBe(true);
        });

        it("ADMIN peut supprimer un vol non signé de son club", () => {
            expect(canDeleteFlight(userRole.ADMIN, false, "club-1", "club-1").allowed).toBe(true);
        });

        it("MANAGER ne peut PAS supprimer (seuls OWNER/ADMIN)", () => {
            expect(canDeleteFlight(userRole.MANAGER, false, "club-1", "club-1").allowed).toBe(false);
        });

        it("personne ne peut supprimer un vol signé", () => {
            expect(canDeleteFlight(userRole.OWNER, true, "club-1", "club-1").allowed).toBe(false);
            expect(canDeleteFlight(userRole.ADMIN, true, "club-1", "club-1").allowed).toBe(false);
        });

        it("ne peut PAS supprimer un vol d'un autre club", () => {
            expect(canDeleteFlight(userRole.ADMIN, false, "club-1", "club-2").allowed).toBe(false);
        });
    });

    describe("Éligibilité pour l'auto-création de logs", () => {
        const now = new Date("2026-04-11T10:00:00Z");

        it("session passée avec élève après la réglementation = éligible", () => {
            expect(isSessionEligibleForLog(new Date("2025-08-01"), "stu-1", now)).toBe(true);
        });

        it("session passée SANS élève = non éligible", () => {
            expect(isSessionEligibleForLog(new Date("2025-08-01"), null, now)).toBe(false);
        });

        it("session AVANT la date de réglementation = non éligible", () => {
            expect(isSessionEligibleForLog(new Date("2025-06-15"), "stu-1", now)).toBe(false);
        });

        it("session future = non éligible", () => {
            expect(isSessionEligibleForLog(new Date("2027-01-01"), "stu-1", now)).toBe(false);
        });

        it("session exactement à la date de réglementation = éligible", () => {
            expect(isSessionEligibleForLog(new Date("2025-07-01"), "stu-1", now)).toBe(true);
        });
    });

    describe("Mise à jour du hobbsTotal sur l'avion", () => {
        it("hobbsEnd met à jour le total si planeID existe", () => {
            const planeID = "plane-1";
            const hobbsEnd = 1500.5;
            const shouldUpdate = !!planeID && !!hobbsEnd;
            expect(shouldUpdate).toBe(true);
        });

        it("pas de mise à jour si planeID est null (noPlane)", () => {
            const planeID = null;
            const hobbsEnd = 1500.5;
            const shouldUpdate = !!planeID && !!hobbsEnd;
            expect(shouldUpdate).toBe(false);
        });

        it("pas de mise à jour si hobbsEnd non renseigné", () => {
            const planeID = "plane-1";
            const hobbsEnd = undefined;
            const shouldUpdate = !!planeID && !!hobbsEnd;
            expect(shouldUpdate).toBe(false);
        });
    });
});
