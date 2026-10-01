import { describe, expect, it } from "vitest";
import { userRole } from "@prisma/client";
import { canEditClubSettings, canManageClub, canSwitchClub, clubTabsFor, overviewKindFor, resolveClubTab } from "../clubAccess";

// ─── canManageClub ───

describe("canManageClub", () => {
    it("autorise la gestion du club", () => {
        expect(canManageClub(userRole.OWNER)).toBe(true);
        expect(canManageClub(userRole.ADMIN)).toBe(true);
        expect(canManageClub(userRole.MANAGER)).toBe(true);
    });

    it("refuse les autres membres du club", () => {
        expect(canManageClub(userRole.INSTRUCTOR)).toBe(false);
        expect(canManageClub(userRole.PILOT)).toBe(false);
        expect(canManageClub(userRole.STUDENT)).toBe(false);
        expect(canManageClub(userRole.USER)).toBe(false);
    });

    it("refuse un rôle absent", () => {
        expect(canManageClub(undefined)).toBe(false);
        expect(canManageClub(null)).toBe(false);
    });
});

// ─── canEditClubSettings ───

describe("canEditClubSettings", () => {
    it("autorise président et admin", () => {
        expect(canEditClubSettings(userRole.OWNER)).toBe(true);
        expect(canEditClubSettings(userRole.ADMIN)).toBe(true);
    });

    it("refuse le manager et les autres membres", () => {
        expect(canEditClubSettings(userRole.MANAGER)).toBe(false);
        expect(canEditClubSettings(userRole.INSTRUCTOR)).toBe(false);
        expect(canEditClubSettings(userRole.PILOT)).toBe(false);
        expect(canEditClubSettings(userRole.STUDENT)).toBe(false);
        expect(canEditClubSettings(userRole.USER)).toBe(false);
    });

    it("refuse un rôle absent", () => {
        expect(canEditClubSettings(undefined)).toBe(false);
        expect(canEditClubSettings(null)).toBe(false);
    });
});

// ─── Club page tabs (AER-68) ───

describe("clubTabsFor", () => {
    const opts = { walletEnabled: true, hasPendingBaptemes: false };

    it("président / admin : tous les onglets", () => {
        expect(clubTabsFor(userRole.OWNER, opts)).toEqual(["overview", "todo", "stats", "wallet", "settings"]);
        expect(clubTabsFor(userRole.ADMIN, opts)).toEqual(["overview", "todo", "stats", "wallet", "settings"]);
    });

    it("manager : pas de paramètres", () => {
        expect(clubTabsFor(userRole.MANAGER, opts)).toEqual(["overview", "todo", "stats", "wallet"]);
    });

    it("portefeuille désactivé : pas d'onglet Portefeuilles", () => {
        expect(clubTabsFor(userRole.OWNER, { ...opts, walletEnabled: false })).not.toContain("wallet");
    });

    it("membres : aperçu seul, sauf baptêmes assignés à traiter", () => {
        for (const role of [userRole.STUDENT, userRole.PILOT, userRole.INSTRUCTOR, userRole.USER]) {
            expect(clubTabsFor(role, opts)).toEqual(["overview"]);
        }
        expect(clubTabsFor(userRole.PILOT, { ...opts, hasPendingBaptemes: true })).toEqual(["overview", "todo"]);
    });
});

describe("resolveClubTab", () => {
    it("garde un onglet accessible, sinon retombe sur l'aperçu", () => {
        expect(resolveClubTab("stats", ["overview", "stats"])).toBe("stats");
        expect(resolveClubTab("settings", ["overview", "stats"])).toBe("overview");
        expect(resolveClubTab(null, ["overview"])).toBe("overview");
        expect(resolveClubTab("n'importe quoi", ["overview"])).toBe("overview");
    });
});

describe("overviewKindFor", () => {
    it("choisit l'aperçu selon le rôle", () => {
        expect(overviewKindFor(userRole.OWNER)).toBe("management");
        expect(overviewKindFor(userRole.MANAGER)).toBe("management");
        expect(overviewKindFor(userRole.INSTRUCTOR)).toBe("instructor");
        expect(overviewKindFor(userRole.STUDENT)).toBe("pilot");
        expect(overviewKindFor(userRole.PILOT)).toBe("pilot");
        expect(overviewKindFor(userRole.USER)).toBe("member");
        expect(overviewKindFor(undefined)).toBe("member");
    });
});

// ─── canSwitchClub ───

describe("canSwitchClub", () => {
    it("autorise un admin à changer son propre club", () => {
        expect(canSwitchClub({ id: "u1", role: userRole.ADMIN }, "u1")).toBe(true);
    });

    it("refuse à un admin de déplacer un autre utilisateur", () => {
        expect(canSwitchClub({ id: "u1", role: userRole.ADMIN }, "u2")).toBe(false);
    });

    it("refuse aux autres rôles, même pour eux-mêmes", () => {
        for (const role of [userRole.OWNER, userRole.MANAGER, userRole.INSTRUCTOR, userRole.PILOT, userRole.STUDENT, userRole.USER]) {
            expect(canSwitchClub({ id: "u1", role }, "u1")).toBe(false);
        }
    });

    it("refuse sans utilisateur", () => {
        expect(canSwitchClub(null, "u1")).toBe(false);
        expect(canSwitchClub(undefined, "u1")).toBe(false);
    });
});
