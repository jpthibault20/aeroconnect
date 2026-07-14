import { describe, it, expect } from "vitest";
import { userRole } from "@prisma/client";
import { canAccessMaintenance } from "@/lib/planeVisibility";
import {
    addMonths,
    getTaskDueStatus,
    isPlaneOverdue,
    MaintenanceTaskLike,
} from "@/lib/maintenance";

// ─── Permissions d'accès à la maintenance ───

describe("canAccessMaintenance", () => {
    const clubPlane = { ownerID: null };
    const privatePlane = { ownerID: "u-owner" };

    const owner = { id: "u-owner", role: userRole.STUDENT };
    const otherStudent = { id: "u-other", role: userRole.STUDENT };
    const pilot = { id: "u-pilot", role: userRole.PILOT };
    const instructor = { id: "u-instr", role: userRole.INSTRUCTOR };
    const manager = { id: "u-manager", role: userRole.MANAGER };
    const president = { id: "u-pres", role: userRole.OWNER };
    const admin = { id: "u-admin", role: userRole.ADMIN };

    it("machine privée : propriétaire + président + admin", () => {
        expect(canAccessMaintenance(privatePlane, owner)).toBe(true);
        expect(canAccessMaintenance(privatePlane, president)).toBe(true);
        expect(canAccessMaintenance(privatePlane, admin)).toBe(true);
    });

    it("machine privée : ni les autres membres ni le manager (non propriétaire)", () => {
        expect(canAccessMaintenance(privatePlane, otherStudent)).toBe(false);
        expect(canAccessMaintenance(privatePlane, pilot)).toBe(false);
        expect(canAccessMaintenance(privatePlane, instructor)).toBe(false);
        expect(canAccessMaintenance(privatePlane, manager)).toBe(false);
    });

    it("machine club : instructeur + manager + président + admin", () => {
        expect(canAccessMaintenance(clubPlane, instructor)).toBe(true);
        expect(canAccessMaintenance(clubPlane, manager)).toBe(true);
        expect(canAccessMaintenance(clubPlane, president)).toBe(true);
        expect(canAccessMaintenance(clubPlane, admin)).toBe(true);
    });

    it("machine club : pilote et élève n'y ont pas accès", () => {
        expect(canAccessMaintenance(clubPlane, pilot)).toBe(false);
        expect(canAccessMaintenance(clubPlane, otherStudent)).toBe(false);
    });
});

// ─── Calcul d'échéance ───

describe("addMonths", () => {
    it("ajoute des mois en franchissant l'année", () => {
        expect(addMonths(new Date("2026-11-15"), 3).toISOString().slice(0, 10)).toBe("2027-02-15");
    });
});

describe("getTaskDueStatus", () => {
    const now = new Date("2026-07-13T12:00:00Z");

    it("borne horaire : en retard quand hobbs courant >= dernière + intervalle", () => {
        const task: MaintenanceTaskLike = {
            intervalHours: 50,
            intervalMonths: null,
            lastPerformedDate: "2026-01-01",
            lastPerformedHobbs: 200,
        };
        // 200 + 50 = 250. À 249 -> pas en retard, à 250 -> en retard.
        expect(getTaskDueStatus(task, 249, now).overdue).toBe(false);
        expect(getTaskDueStatus(task, 250, now).overdue).toBe(true);
        expect(getTaskDueStatus(task, 249, now).nextDueHobbs).toBe(250);
        expect(getTaskDueStatus(task, 249, now).hoursRemaining).toBe(1);
    });

    it("borne mensuelle : en retard quand la date d'échéance est passée", () => {
        const task: MaintenanceTaskLike = {
            intervalHours: null,
            intervalMonths: 12,
            lastPerformedDate: "2025-06-01",
            lastPerformedHobbs: 0,
        };
        // Échéance 2026-06-01 < now (2026-07-13) -> en retard.
        expect(getTaskDueStatus(task, null, now).overdue).toBe(true);
    });

    it("borne mensuelle : pas en retard si l'échéance est future", () => {
        const task: MaintenanceTaskLike = {
            intervalHours: null,
            intervalMonths: 12,
            lastPerformedDate: "2026-06-01",
            lastPerformedHobbs: 0,
        };
        // Échéance 2027-06-01 > now -> OK.
        expect(getTaskDueStatus(task, null, now).overdue).toBe(false);
    });

    it("double borne : la première atteinte (heures OU date) déclenche le retard", () => {
        const task: MaintenanceTaskLike = {
            intervalHours: 50,
            intervalMonths: 24,
            lastPerformedDate: "2026-06-01", // échéance date lointaine
            lastPerformedHobbs: 200,
        };
        // Date OK mais heures dépassées -> en retard.
        expect(getTaskDueStatus(task, 300, now).overdue).toBe(true);
    });

    it("borne horaire sans heures moteur connues : jamais en retard sur les heures", () => {
        const task: MaintenanceTaskLike = {
            intervalHours: 50,
            intervalMonths: null,
            lastPerformedDate: "2026-01-01",
            lastPerformedHobbs: 200,
        };
        expect(getTaskDueStatus(task, null, now).overdue).toBe(false);
    });
});

describe("isPlaneOverdue", () => {
    const now = new Date("2026-07-13T12:00:00Z");

    it("vrai dès qu'un rappel est en retard", () => {
        const tasks: MaintenanceTaskLike[] = [
            { intervalHours: 50, intervalMonths: null, lastPerformedDate: "2026-01-01", lastPerformedHobbs: 200 },
            { intervalHours: null, intervalMonths: 12, lastPerformedDate: "2020-01-01", lastPerformedHobbs: 0 },
        ];
        expect(isPlaneOverdue(tasks, 210, now)).toBe(true); // le 2e (date) est en retard
    });

    it("faux quand aucun rappel n'est en retard", () => {
        const tasks: MaintenanceTaskLike[] = [
            { intervalHours: 50, intervalMonths: null, lastPerformedDate: "2026-01-01", lastPerformedHobbs: 200 },
        ];
        expect(isPlaneOverdue(tasks, 210, now)).toBe(false);
    });

    it("faux sans aucun rappel", () => {
        expect(isPlaneOverdue([], 500, now)).toBe(false);
    });
});
