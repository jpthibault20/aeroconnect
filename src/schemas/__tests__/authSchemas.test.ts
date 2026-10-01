import { describe, it, expect } from "vitest";
import { registerSchema } from "@/schemas/registerSchema";
import { loginSchema } from "@/schemas/loginSchema";
import { newPasswordSchema, updatePasswordSchema } from "@/schemas/newPasswordSchema";

/**
 * Auth form validation. These schemas are the only client-side barrier before
 * calling Supabase: any unintended loosening (rule removed, message changed) must
 * break here.
 */

// First error message for a given field, or undefined if the field passes.
const errorFor = (
    schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } } },
    value: unknown,
    field: string
): string | undefined => {
    const res = schema.safeParse(value);
    if (res.success) return undefined;
    return res.error?.issues.find((i) => i.path[0] === field)?.message;
};

// ─── Sign-up ───

describe("registerSchema — formulaire de création de compte", () => {
    const valid = {
        lastName: "Dupont",
        firstName: "Luc",
        email: "luc@club.fr",
        password: "motdepasse",
        phone: "0601020304",
    };

    it("accepte un formulaire complet et valide", () => {
        expect(registerSchema.safeParse(valid).success).toBe(true);
    });

    it("exige un nom et un prénom d'au moins 2 caractères", () => {
        expect(errorFor(registerSchema, { ...valid, lastName: "D" }, "lastName")).toContain("2 caractères");
        expect(errorFor(registerSchema, { ...valid, firstName: "L" }, "firstName")).toContain("2 caractères");
    });

    it("rejette une adresse email malformée", () => {
        for (const email of ["luc", "luc@", "@club.fr", "luc club.fr", ""]) {
            expect(registerSchema.safeParse({ ...valid, email }).success).toBe(false);
        }
    });

    it("exige un mot de passe d'au moins 6 caractères", () => {
        expect(registerSchema.safeParse({ ...valid, password: "12345" }).success).toBe(false);
        expect(registerSchema.safeParse({ ...valid, password: "123456" }).success).toBe(true);
    });

    it("exige un téléphone d'au moins 10 caractères", () => {
        expect(registerSchema.safeParse({ ...valid, phone: "060102030" }).success).toBe(false);
        expect(registerSchema.safeParse({ ...valid, phone: "0601020304" }).success).toBe(true);
    });

    it("rejette un formulaire dont un champ est absent", () => {
        for (const field of Object.keys(valid)) {
            const incomplete = { ...valid } as Record<string, unknown>;
            delete incomplete[field];
            expect(registerSchema.safeParse(incomplete).success).toBe(false);
        }
    });

    it("les messages d'erreur sont en français", () => {
        const res = registerSchema.safeParse({ ...valid, email: "x" });
        expect(res.success).toBe(false);
        if (!res.success) {
            expect(res.error.issues[0].message).toBe("L'adresse e-mail est invalide");
        }
    });
});

// ─── Login ───

describe("loginSchema — formulaire de connexion", () => {
    const valid = { email: "luc@club.fr", password: "motdepasse" };

    it("accepte des identifiants bien formés", () => {
        expect(loginSchema.safeParse(valid).success).toBe(true);
    });

    it("rejette un email invalide et un mot de passe trop court", () => {
        expect(loginSchema.safeParse({ ...valid, email: "luc" }).success).toBe(false);
        expect(loginSchema.safeParse({ ...valid, password: "12345" }).success).toBe(false);
    });

    it("rejette les champs vides", () => {
        expect(loginSchema.safeParse({ email: "", password: "" }).success).toBe(false);
    });

    it("ne demande QUE l'email et le mot de passe", () => {
        // Regression: adding a required field here would break the existing login form.
        const res = loginSchema.safeParse(valid);
        expect(res.success).toBe(true);
        if (res.success) expect(Object.keys(res.data).sort()).toEqual(["email", "password"]);
    });
});

// ─── Forgotten password ───

describe("newPasswordSchema — demande de réinitialisation", () => {
    it("accepte une adresse valide", () => {
        expect(newPasswordSchema.safeParse({ email: "luc@club.fr" }).success).toBe(true);
    });

    it("rejette une adresse invalide ou vide", () => {
        expect(newPasswordSchema.safeParse({ email: "luc" }).success).toBe(false);
        expect(newPasswordSchema.safeParse({ email: "" }).success).toBe(false);
    });
});

describe("updatePasswordSchema — saisie du nouveau mot de passe", () => {
    it("accepte deux mots de passe identiques d'au moins 6 caractères", () => {
        expect(
            updatePasswordSchema.safeParse({ password: "motdepasse", confirmPassword: "motdepasse" })
                .success
        ).toBe(true);
    });

    it("rejette un mot de passe trop court", () => {
        expect(
            updatePasswordSchema.safeParse({ password: "12345", confirmPassword: "12345" }).success
        ).toBe(false);
    });

    it("rejette deux mots de passe différents, et cible le champ de confirmation", () => {
        const res = updatePasswordSchema.safeParse({
            password: "motdepasse",
            confirmPassword: "motdepass",
        });
        expect(res.success).toBe(false);
        if (!res.success) {
            const issue = res.error.issues[0];
            expect(issue.path).toEqual(["confirmPassword"]);
            expect(issue.message).toBe("Les mots de passe ne correspondent pas");
        }
    });

    it("la confirmation n'a pas de longueur minimale propre (seule la concordance compte)", () => {
        // Otherwise the user gets two contradictory errors while typing.
        const res = updatePasswordSchema.safeParse({ password: "abc", confirmPassword: "abc" });
        expect(res.success).toBe(false);
        if (!res.success) {
            expect(res.error.issues.every((i) => i.path[0] !== "confirmPassword")).toBe(true);
        }
    });
});
