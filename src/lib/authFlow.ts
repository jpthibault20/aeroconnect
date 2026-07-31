/**
 * Règles de navigation et messages des flux d'authentification (création de
 * compte, connexion, mot de passe perdu).
 *
 * Les server actions correspondantes ne font qu'appeler Supabase puis
 * `redirect()` : toute la décision « où aller et avec quel message » est
 * factorisée ici, en fonctions pures, pour être testable (cf. convention
 * CLAUDE.md — extraire la logique des server actions puis la tester).
 *
 * Convention des pages auth : le paramètre `message` porte une erreur,
 * `messageG` un succès (affichage vert). Ne pas les intervertir.
 */

export const AUTH_ROUTES = {
    login: "/auth/login",
    register: "/auth/register",
    forgotPassword: "/auth/forgotPassword",
    newPassword: "/auth/newPassword",
    calendar: "/calendar",
} as const;

// Messages utilisateur. Les codes E_00x sont repris tels quels dans le support :
// ne pas les modifier sans prévenir.
export const AUTH_MESSAGES = {
    signupAuthFailed:
        "Une erreur est survenue lors de la création du compte, se rapprocher de l'administrateur (E_009: failed to create auth user)",
    signupProfileFailed:
        "Une erreur est survenue lors de la création du compte, se rapprocher de l'administrateur (E_010: failed to create private user)",
    signupSuccess: "Compte créé avec succès",
    loginInvalidCredentials: "Informations de connexion incorrectes (E_008: invalid credentials)",
    emailMissing: "Email manquant",
    passwordMissing: "Mot de passe manquant",
    passwordMismatch: "Les mots de passe ne correspondent pas",
    resetEmailFailed: "Erreur lors de l'envoi de l'email de réinitialisation",
    resetEmailSent: "Email de réinitialisation envoyé",
    passwordUpdateFailed: "Erreur lors de la mise à jour du mot de passe",
    passwordUpdated: "Mot de passe mis à jour",
} as const;

export type AuthMessageKind = "error" | "success";

/** URL de destination avec son message, encodé. */
export function authRedirect(path: string, kind: AuthMessageKind, message: string): string {
    const param = kind === "success" ? "messageG" : "message";
    return `${path}?${param}=${encodeURIComponent(message)}`;
}

// ─── Création de compte ───

export type SignupOutcome = "authError" | "profileError" | "success";

/**
 * Où renvoyer l'utilisateur après une tentative de création de compte.
 *
 * Note : un échec côté Supabase renvoie vers la page de connexion, un échec de
 * création du profil Prisma vers le formulaire d'inscription (le compte auth
 * existe alors déjà). C'est le comportement historique, conservé tel quel.
 */
export function signupRedirect(outcome: SignupOutcome): string {
    switch (outcome) {
        case "authError":
            return authRedirect(AUTH_ROUTES.login, "error", AUTH_MESSAGES.signupAuthFailed);
        case "profileError":
            return authRedirect(AUTH_ROUTES.register, "error", AUTH_MESSAGES.signupProfileFailed);
        case "success":
            return authRedirect(AUTH_ROUTES.login, "success", AUTH_MESSAGES.signupSuccess);
    }
}

// ─── Connexion ───

/** Réponse renvoyée au formulaire quand les identifiants sont refusés. */
export function loginFailure(): { success: false; message: string } {
    return { success: false, message: AUTH_MESSAGES.loginInvalidCredentials };
}

/**
 * Destination après connexion réussie. Un membre sans club part avec un clubID
 * vide : le calendrier gère ce cas (écran « aucun club »).
 */
export function loginRedirect(clubID: string | null | undefined): string {
    return `${AUTH_ROUTES.calendar}?clubID=${clubID || ""}`;
}

// ─── Mot de passe perdu : demande de réinitialisation ───

export type ForgotPasswordOutcome = "missingEmail" | "sendError" | "sent";

export function forgotPasswordRedirect(outcome: ForgotPasswordOutcome): string {
    switch (outcome) {
        case "missingEmail":
            return authRedirect(AUTH_ROUTES.forgotPassword, "error", AUTH_MESSAGES.emailMissing);
        case "sendError":
            return authRedirect(AUTH_ROUTES.forgotPassword, "error", AUTH_MESSAGES.resetEmailFailed);
        case "sent":
            return authRedirect(AUTH_ROUTES.login, "success", AUTH_MESSAGES.resetEmailSent);
    }
}

/**
 * URL de retour transmise à Supabase pour le lien de réinitialisation. Le slash
 * final de la base est retiré : sans ça le lien contiendrait `//auth/...`.
 */
export function passwordResetRedirectTo(baseUrl: string | undefined | null): string {
    const base = (baseUrl ?? "").trim().replace(/\/+$/, "");
    return `${base}${AUTH_ROUTES.newPassword}`;
}

// ─── Mot de passe perdu : nouveau mot de passe ───

export type UpdatePasswordOutcome = "missingEmail" | "updateError" | "success";

export function updatePasswordRedirect(outcome: UpdatePasswordOutcome): string {
    switch (outcome) {
        case "missingEmail":
            return authRedirect(AUTH_ROUTES.login, "error", AUTH_MESSAGES.emailMissing);
        case "updateError":
            return authRedirect(
                AUTH_ROUTES.forgotPassword,
                "error",
                AUTH_MESSAGES.passwordUpdateFailed
            );
        case "success":
            return authRedirect(AUTH_ROUTES.login, "success", AUTH_MESSAGES.passwordUpdated);
    }
}

export type NewPasswordCheck = { ok: true } | { ok: false; redirect: string };

/**
 * Contrôle du couple mot de passe / confirmation avant d'appeler Supabase.
 * Un champ vide et une non-concordance ne donnent pas le même message.
 */
export function validateNewPassword(
    password: string | null | undefined,
    confirmPassword: string | null | undefined
): NewPasswordCheck {
    if (!password || !confirmPassword) {
        return {
            ok: false,
            redirect: authRedirect(
                AUTH_ROUTES.forgotPassword,
                "error",
                AUTH_MESSAGES.passwordMissing
            ),
        };
    }
    if (password !== confirmPassword) {
        return {
            ok: false,
            redirect: authRedirect(
                AUTH_ROUTES.forgotPassword,
                "error",
                AUTH_MESSAGES.passwordMismatch
            ),
        };
    }
    return { ok: true };
}
