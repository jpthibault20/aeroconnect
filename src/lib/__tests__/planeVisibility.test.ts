import { describe, it, expect } from "vitest";
import { MachineUsage, userRole } from "@prisma/client";
import {
    canManagePlane,
    canReassignPlaneOwner,
    canViewPlane,
    filterVisiblePlanes,
    filterBookablePlanes,
    isPrivatePlane,
    resolveOwnerReassignment,
    resolvePlaneCreation,
    sanitizeClubUsages,
} from "@/lib/planeVisibility";

// Machine du club (propriétaire = le club).
const clubPlane = { ownerID: null };
// Machine privée appartenant à "u-owner".
const privatePlane = { ownerID: "u-owner" };

const owner = { id: "u-owner", role: userRole.STUDENT };
const otherStudent = { id: "u-other", role: userRole.STUDENT };
const president = { id: "u-pres", role: userRole.OWNER };
const admin = { id: "u-admin", role: userRole.ADMIN };
const manager = { id: "u-manager", role: userRole.MANAGER };

describe("isPrivatePlane", () => {
    it("est privée ssi ownerID renseigné", () => {
        expect(isPrivatePlane(clubPlane)).toBe(false);
        expect(isPrivatePlane(privatePlane)).toBe(true);
    });
});

describe("canViewPlane", () => {
    it("une machine du club est visible par tous", () => {
        expect(canViewPlane(clubPlane, otherStudent)).toBe(true);
        expect(canViewPlane(clubPlane, owner)).toBe(true);
    });

    it("une machine privée est visible par son propriétaire", () => {
        expect(canViewPlane(privatePlane, owner)).toBe(true);
    });

    it("une machine privée n'est PAS visible par un autre membre", () => {
        expect(canViewPlane(privatePlane, otherStudent)).toBe(false);
    });

    it("une machine privée est visible par le président et l'admin", () => {
        expect(canViewPlane(privatePlane, president)).toBe(true);
        expect(canViewPlane(privatePlane, admin)).toBe(true);
    });

    it("une machine privée n'est PAS visible par un manager tiers", () => {
        expect(canViewPlane(privatePlane, manager)).toBe(false);
    });
});

describe("canManagePlane", () => {
    it("machine du club : gérée par les rôles de gestion uniquement", () => {
        expect(canManagePlane(clubPlane, manager)).toBe(true);
        expect(canManagePlane(clubPlane, president)).toBe(true);
        expect(canManagePlane(clubPlane, admin)).toBe(true);
        expect(canManagePlane(clubPlane, otherStudent)).toBe(false);
    });

    it("machine privée : gérée par le propriétaire, le président et l'admin", () => {
        expect(canManagePlane(privatePlane, owner)).toBe(true);
        expect(canManagePlane(privatePlane, president)).toBe(true);
        expect(canManagePlane(privatePlane, admin)).toBe(true);
        expect(canManagePlane(privatePlane, otherStudent)).toBe(false);
        expect(canManagePlane(privatePlane, manager)).toBe(false);
    });
});

describe("filterVisiblePlanes", () => {
    const fleet = [
        { id: "club", ownerID: null },
        { id: "mine", ownerID: "u-owner" },
        { id: "theirs", ownerID: "u-other" },
    ];

    it("un membre voit les machines du club + la sienne, pas celle des autres", () => {
        const visible = filterVisiblePlanes(fleet, owner).map((p) => p.id);
        expect(visible).toEqual(["club", "mine"]);
    });

    it("le président voit toutes les machines", () => {
        const visible = filterVisiblePlanes(fleet, president).map((p) => p.id);
        expect(visible).toEqual(["club", "mine", "theirs"]);
    });
});

// ─────────────────────────────────────────────────────────────
// sanitizeClubUsages
// ─────────────────────────────────────────────────────────────

describe("sanitizeClubUsages", () => {
    it("conserve les usages club valides", () => {
        const usages = [MachineUsage.INSTRUCTION, MachineUsage.LOCATION, MachineUsage.CLUB];
        expect(sanitizeClubUsages(usages)).toEqual(usages);
    });

    it("rejette les doublons de valeurs non-club (aucun ici) et garde l'ordre", () => {
        expect(sanitizeClubUsages([MachineUsage.CLUB, MachineUsage.INSTRUCTION]))
            .toEqual([MachineUsage.CLUB, MachineUsage.INSTRUCTION]);
    });

    it("un tableau vide reste vide", () => {
        expect(sanitizeClubUsages([])).toEqual([]);
    });
});

// ─────────────────────────────────────────────────────────────
// resolvePlaneCreation — propriétaire + usages selon rôle & type
// ─────────────────────────────────────────────────────────────

describe("resolvePlaneCreation", () => {
    const student = { id: "stu-1", role: userRole.STUDENT };
    const pilot = { id: "pil-1", role: userRole.PILOT };
    const manager = { id: "mgr-1", role: userRole.MANAGER };
    const admin = { id: "adm-1", role: userRole.ADMIN };
    const simpleUser = { id: "usr-1", role: userRole.USER };

    it("USER ne peut créer aucune machine", () => {
        expect(resolvePlaneCreation(simpleUser, "private", [])).toEqual({ error: "Permissions insuffisantes" });
        expect(resolvePlaneCreation(simpleUser, "club", [MachineUsage.CLUB])).toEqual({ error: "Permissions insuffisantes" });
    });

    it("machine privée : propriétaire = créateur, aucun usage (même si des usages sont demandés)", () => {
        expect(resolvePlaneCreation(student, "private", [MachineUsage.INSTRUCTION])).toEqual({
            ownerID: "stu-1",
            usageTypes: [],
        });
        expect(resolvePlaneCreation(pilot, "private", [])).toEqual({ ownerID: "pil-1", usageTypes: [] });
    });

    it("un non-gestionnaire ne peut PAS créer une machine du club", () => {
        expect(resolvePlaneCreation(student, "club", [MachineUsage.CLUB]))
            .toEqual({ error: "Seuls les gestionnaires peuvent créer une machine du club" });
        expect(resolvePlaneCreation(pilot, "club", [MachineUsage.INSTRUCTION]))
            .toEqual({ error: "Seuls les gestionnaires peuvent créer une machine du club" });
    });

    it("machine du club : propriétaire = le club (null), usages filtrés", () => {
        expect(resolvePlaneCreation(manager, "club", [MachineUsage.INSTRUCTION, MachineUsage.LOCATION])).toEqual({
            ownerID: null,
            usageTypes: [MachineUsage.INSTRUCTION, MachineUsage.LOCATION],
        });
        expect(resolvePlaneCreation(admin, "club", [MachineUsage.CLUB])).toEqual({
            ownerID: null,
            usageTypes: [MachineUsage.CLUB],
        });
    });

    it("machine du club sans usage valide → erreur", () => {
        expect(resolvePlaneCreation(manager, "club", [])).toEqual({
            error: "Sélectionnez au moins un usage pour la machine du club",
        });
    });
});

// ─────────────────────────────────────────────────────────────
// canReassignPlaneOwner / resolveOwnerReassignment
// ─────────────────────────────────────────────────────────────

describe("canReassignPlaneOwner", () => {
    it("président et admin peuvent réattribuer le propriétaire", () => {
        expect(canReassignPlaneOwner(president)).toBe(true);
        expect(canReassignPlaneOwner(admin)).toBe(true);
    });

    it("aucun autre rôle ne peut réattribuer le propriétaire", () => {
        expect(canReassignPlaneOwner(manager)).toBe(false);
        expect(canReassignPlaneOwner(owner)).toBe(false);
        expect(canReassignPlaneOwner(otherStudent)).toBe(false);
    });
});

describe("resolveOwnerReassignment", () => {
    it("réattribution à un membre : machine privée, aucun usage club", () => {
        expect(resolveOwnerReassignment("u-new-owner", [MachineUsage.INSTRUCTION])).toEqual({
            ownerID: "u-new-owner",
            usageTypes: [],
        });
    });

    it("réattribution au club depuis une machine déjà club : usages existants conservés", () => {
        expect(resolveOwnerReassignment(null, [MachineUsage.LOCATION])).toEqual({
            ownerID: null,
            usageTypes: [MachineUsage.LOCATION],
        });
    });

    it("réattribution au club depuis une machine privée (aucun usage) : tous les usages par défaut", () => {
        expect(resolveOwnerReassignment(null, [])).toEqual({
            ownerID: null,
            usageTypes: [MachineUsage.INSTRUCTION, MachineUsage.LOCATION, MachineUsage.CLUB],
        });
    });
});

// ─────────────────────────────────────────────────────────────
// filterBookablePlanes — visibilité ∩ classe
// ─────────────────────────────────────────────────────────────

describe("filterBookablePlanes", () => {
    // Élève noté sur les classes [3], possédant la machine privée "mine".
    const student = { id: "me", role: userRole.STUDENT, classes: [3] };

    const fleet = [
        { id: "club-c3", ownerID: null, classes: 3 },        // club, bonne classe → OUI
        { id: "club-c1", ownerID: null, classes: 1 },        // club, mauvaise classe → non
        { id: "mine-c3", ownerID: "me", classes: 3 },        // ma privée, bonne classe → OUI
        { id: "mine-c1", ownerID: "me", classes: 1 },        // ma privée, mauvaise classe → non
        { id: "theirs-c3", ownerID: "autre", classes: 3 },   // privée d'un autre → non (invisible)
    ];

    it("un élève ne peut réserver que ses classes ET les machines qu'il voit", () => {
        const ids = filterBookablePlanes(fleet, student).map((p) => p.id);
        expect(ids).toEqual(["club-c3", "mine-c3"]);
    });

    it("ne propose jamais la machine privée d'un autre, même de la bonne classe", () => {
        const ids = filterBookablePlanes(fleet, student).map((p) => p.id);
        expect(ids).not.toContain("theirs-c3");
    });

    it("le président voit sa flotte de la bonne classe + les privées des autres", () => {
        const president = { id: "pres", role: userRole.OWNER, classes: [3] };
        const ids = filterBookablePlanes(fleet, president).map((p) => p.id);
        // Toutes les classes 3, y compris la privée d'un autre (supervision).
        expect(ids).toEqual(["club-c3", "mine-c3", "theirs-c3"]);
    });
});
