import { describe, it, expect } from "vitest";
import { clubFormSchema } from "@/schemas/club";

/**
 * New club form, re-validated server-side by createClub (the action can be
 * called directly, bypassing the form).
 */

const valid = { name: "Club Test", id: "abc", workStartTime: "09", workEndTime: "18", sessionDuration: 60 };

describe("clubFormSchema", () => {
    it("accepts a valid club and uppercases its ID", () => {
        const res = clubFormSchema.safeParse(valid);
        expect(res.success).toBe(true);
        if (res.success) expect(res.data.id).toBe("ABC");
    });

    it("rejects a missing name or a too short ID", () => {
        expect(clubFormSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
        expect(clubFormSchema.safeParse({ ...valid, id: "AB" }).success).toBe(false);
    });

    it("rejects a working day shorter than 3 hours", () => {
        const res = clubFormSchema.safeParse({ ...valid, workStartTime: "09", workEndTime: "11" });
        expect(res.success).toBe(false);
        if (!res.success) expect(res.error.issues[0].message).toBe("La journée doit durer au moins 3h.");
    });

    it("rejects an inverted range (no negative-length HoursOn)", () => {
        expect(clubFormSchema.safeParse({ ...valid, workStartTime: "18", workEndTime: "09" }).success).toBe(false);
    });
});
