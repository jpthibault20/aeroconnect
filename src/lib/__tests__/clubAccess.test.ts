import { describe, expect, it } from "vitest";
import { userRole } from "@prisma/client";
import { canEditClubSettings, canManageClub } from "../clubAccess";

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
