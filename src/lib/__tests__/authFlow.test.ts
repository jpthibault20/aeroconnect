import { describe, it, expect } from "vitest";
import {
    AUTH_MESSAGES,
    AUTH_ROUTES,
    authRedirect,
    forgotPasswordRedirect,
    loginFailure,
    loginRedirect,
    passwordResetRedirectTo,
    signupRedirect,
    updatePasswordRedirect,
    validateNewPassword,
} from "@/lib/authFlow";

/**
 * Verrou de non-régression des trois flux d'authentification : création de
 * compte, connexion, mot de passe perdu.
 *
 * Ce qui est couvert ici, ce sont les DÉCISIONS (destination + message + type de
 * message). L'appel à Supabase lui-même n'est pas testé : les server actions se
 * contentent de lui passer la main puis d'appeler `redirect()` avec le résultat
 * de ces fonctions.
 */

// Lit le message décodé d'une URL de redirection, et dit s'il est présenté
// comme une erreur (`message`) ou comme un succès (`messageG`).
const parse = (url: string) => {
    const [path, query] = url.split("?");
    const params = new URLSearchParams(query ?? "");
    const error = params.get("message");
    const success = params.get("messageG");
    return {
        path,
        kind: success != null ? "success" : "error",
        message: success ?? error,
    };
};

describe("authRedirect — convention message / messageG", () => {
    it("une erreur passe par `message`", () => {
        expect(authRedirect("/x", "error", "Oups")).toBe("/x?message=Oups");
    });

    it("un succès passe par `messageG` (affichage vert des pages auth)", () => {
        expect(authRedirect("/x", "success", "Bravo")).toBe("/x?messageG=Bravo");
    });

    it("le message est encodé (espaces, apostrophes, accents)", () => {
        const url = authRedirect("/x", "error", "Erreur d'envoi à l'élève");
        expect(url).not.toContain(" ");
        expect(parse(url).message).toBe("Erreur d'envoi à l'élève");
    });
});

// ─── Création de compte ───

describe("Création de compte", () => {
    it("échec Supabase → page de connexion, avec le code E_009", () => {
        const r = parse(signupRedirect("authError"));
        expect(r.path).toBe(AUTH_ROUTES.login);
        expect(r.kind).toBe("error");
        expect(r.message).toContain("E_009");
    });

    it("échec de création du profil → retour au formulaire, avec le code E_010", () => {
        // Le compte Supabase existe déjà à ce stade : on renvoie vers
        // l'inscription et non vers la connexion. Comportement historique.
        const r = parse(signupRedirect("profileError"));
        expect(r.path).toBe(AUTH_ROUTES.register);
        expect(r.kind).toBe("error");
        expect(r.message).toContain("E_010");
    });

    it("succès → page de connexion, en message de succès", () => {
        const r = parse(signupRedirect("success"));
        expect(r.path).toBe(AUTH_ROUTES.login);
        expect(r.kind).toBe("success");
        expect(r.message).toBe(AUTH_MESSAGES.signupSuccess);
    });

    it("les deux échecs ne se confondent pas (codes distincts)", () => {
        expect(signupRedirect("authError")).not.toBe(signupRedirect("profileError"));
    });
});

// ─── Connexion ───

describe("Connexion", () => {
    it("identifiants refusés → réponse d'échec au formulaire, pas de redirection", () => {
        const res = loginFailure();
        expect(res.success).toBe(false);
        expect(res.message).toContain("E_008");
    });

    it("succès → calendrier du club de l'utilisateur", () => {
        expect(loginRedirect("LF666")).toBe("/calendar?clubID=LF666");
    });

    it("utilisateur sans club → calendrier avec un clubID vide", () => {
        // Cas réel : compte créé mais pas encore rattaché à un club. La page
        // calendrier gère ce cas, il ne faut donc pas bloquer la connexion.
        expect(loginRedirect(null)).toBe("/calendar?clubID=");
        expect(loginRedirect(undefined)).toBe("/calendar?clubID=");
        expect(loginRedirect("")).toBe("/calendar?clubID=");
    });
});

// ─── Mot de passe perdu : demande ───

describe("Mot de passe perdu — demande de réinitialisation", () => {
    it("email absent → on reste sur le formulaire avec un message d'erreur", () => {
        const r = parse(forgotPasswordRedirect("missingEmail"));
        expect(r.path).toBe(AUTH_ROUTES.forgotPassword);
        expect(r.kind).toBe("error");
        expect(r.message).toBe(AUTH_MESSAGES.emailMissing);
    });

    it("échec d'envoi → on reste sur le formulaire", () => {
        const r = parse(forgotPasswordRedirect("sendError"));
        expect(r.path).toBe(AUTH_ROUTES.forgotPassword);
        expect(r.kind).toBe("error");
    });

    it("email envoyé → page de connexion, en message de succès", () => {
        const r = parse(forgotPasswordRedirect("sent"));
        expect(r.path).toBe(AUTH_ROUTES.login);
        expect(r.kind).toBe("success");
        expect(r.message).toBe(AUTH_MESSAGES.resetEmailSent);
    });

    it("le lien de retour envoyé à Supabase pointe la page nouveau mot de passe", () => {
        expect(passwordResetRedirectTo("https://aeroconnect.fr")).toBe(
            "https://aeroconnect.fr/auth/newPassword"
        );
    });

    it("un slash final dans la variable d'env ne produit pas `//auth`", () => {
        expect(passwordResetRedirectTo("http://localhost:3000/")).toBe(
            "http://localhost:3000/auth/newPassword"
        );
        expect(passwordResetRedirectTo(" http://localhost:3000 ")).toBe(
            "http://localhost:3000/auth/newPassword"
        );
    });

    it("variable d'env absente : le lien est relatif (symptôme à surveiller)", () => {
        // Documenté volontairement : c'est le même défaut que le lien baptême
        // cassé (cf. lib/appUrl). Si ce test change, c'est que la source de
        // l'URL de base a été revue.
        expect(passwordResetRedirectTo(undefined)).toBe("/auth/newPassword");
    });
});

// ─── Mot de passe perdu : nouveau mot de passe ───

describe("Mot de passe perdu — saisie du nouveau mot de passe", () => {
    it("les deux champs concordants passent", () => {
        expect(validateNewPassword("motdepasse", "motdepasse")).toEqual({ ok: true });
    });

    it("un champ vide → message « mot de passe manquant »", () => {
        for (const [p, c] of [["", "x"], ["x", ""], ["", ""]] as const) {
            const res = validateNewPassword(p, c);
            expect(res.ok).toBe(false);
            if (!res.ok) expect(parse(res.redirect).message).toBe(AUTH_MESSAGES.passwordMissing);
        }
    });

    it("champs non concordants → message distinct de « champ manquant »", () => {
        const res = validateNewPassword("motdepasse", "motdepass");
        expect(res.ok).toBe(false);
        if (!res.ok) {
            expect(parse(res.redirect).message).toBe(AUTH_MESSAGES.passwordMismatch);
            expect(parse(res.redirect).path).toBe(AUTH_ROUTES.forgotPassword);
        }
    });

    it("la validation ne juge PAS la longueur (c'est le rôle du schéma zod)", () => {
        // Régression possible : dupliquer la règle des 6 caractères ici la
        // ferait diverger de updatePasswordSchema.
        expect(validateNewPassword("abc", "abc")).toEqual({ ok: true });
    });

    it("lien expiré / code invalide → retour connexion avec « Email manquant »", () => {
        const r = parse(updatePasswordRedirect("missingEmail"));
        expect(r.path).toBe(AUTH_ROUTES.login);
        expect(r.kind).toBe("error");
    });

    it("échec de mise à jour → retour au formulaire mot de passe oublié", () => {
        const r = parse(updatePasswordRedirect("updateError"));
        expect(r.path).toBe(AUTH_ROUTES.forgotPassword);
        expect(r.kind).toBe("error");
    });

    it("succès → page de connexion, en message de succès", () => {
        const r = parse(updatePasswordRedirect("success"));
        expect(r.path).toBe(AUTH_ROUTES.login);
        expect(r.kind).toBe("success");
        expect(r.message).toBe(AUTH_MESSAGES.passwordUpdated);
    });
});

// ─── Invariants transverses ───

describe("Invariants des flux d'authentification", () => {
    const allRedirects = [
        signupRedirect("authError"),
        signupRedirect("profileError"),
        signupRedirect("success"),
        forgotPasswordRedirect("missingEmail"),
        forgotPasswordRedirect("sendError"),
        forgotPasswordRedirect("sent"),
        updatePasswordRedirect("missingEmail"),
        updatePasswordRedirect("updateError"),
        updatePasswordRedirect("success"),
    ];

    it("toute redirection porte exactement un message, jamais les deux", () => {
        for (const url of allRedirects) {
            const params = new URLSearchParams(url.split("?")[1] ?? "");
            const count = [params.get("message"), params.get("messageG")].filter(Boolean).length;
            expect(count).toBe(1);
        }
    });

    it("aucun message n'est vide et tous sont en français (pas de clé technique nue)", () => {
        for (const url of allRedirects) {
            const msg = parse(url).message ?? "";
            expect(msg.length).toBeGreaterThan(3);
            expect(msg).not.toMatch(/^[A-Z_]+$/);
        }
    });

    it("toutes les destinations sont des chemins internes (pas d'URL absolue)", () => {
        for (const url of allRedirects) {
            expect(url.startsWith("/")).toBe(true);
        }
    });

    it("un succès n'atterrit jamais sur la page qu'on vient de quitter", () => {
        expect(parse(signupRedirect("success")).path).not.toBe(AUTH_ROUTES.register);
        expect(parse(forgotPasswordRedirect("sent")).path).not.toBe(AUTH_ROUTES.forgotPassword);
        expect(parse(updatePasswordRedirect("success")).path).not.toBe(AUTH_ROUTES.newPassword);
    });
});
