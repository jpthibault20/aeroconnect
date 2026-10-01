/**
 * Navigation rules and messages of the auth flows (sign-up, login, forgotten
 * password).
 *
 * The matching server actions only call Supabase then `redirect()`: every
 * "where to go and with which message" decision is factored out here as pure
 * functions so it can be tested (see CLAUDE.md: extract logic from server
 * actions, then test it).
 *
 * Auth pages convention: the `message` param carries an error, `messageG` a
 * success (green). Do not swap them.
 */

export const AUTH_ROUTES = {
    login: "/auth/login",
    register: "/auth/register",
    forgotPassword: "/auth/forgotPassword",
    newPassword: "/auth/newPassword",
    calendar: "/calendar",
} as const;

// User messages. The E_00x codes are quoted as-is by support: do not change them
// without notice.
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

/** Destination URL with its encoded message. */
export function authRedirect(path: string, kind: AuthMessageKind, message: string): string {
    const param = kind === "success" ? "messageG" : "message";
    return `${path}?${param}=${encodeURIComponent(message)}`;
}

// ─── Sign-up ───

export type SignupOutcome = "authError" | "profileError" | "success";

/**
 * Where to send the user after a sign-up attempt.
 *
 * Note: a Supabase failure goes to the login page, a Prisma profile creation
 * failure to the sign-up form (the auth account already exists then).
 * Historical behavior, kept as is.
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

// ─── Login ───

/** Response returned to the form when the credentials are rejected. */
export function loginFailure(): { success: false; message: string } {
    return { success: false, message: AUTH_MESSAGES.loginInvalidCredentials };
}

/**
 * Destination after a successful login. A member without a club leaves with an
 * empty clubID: the calendar handles it ("no club" screen).
 */
export function loginRedirect(clubID: string | null | undefined): string {
    return `${AUTH_ROUTES.calendar}?clubID=${clubID || ""}`;
}

// ─── Forgotten password: reset request ───

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
 * Return URL passed to Supabase for the reset link. The base's trailing slash is
 * removed, otherwise the link would contain `//auth/...`.
 */
export function passwordResetRedirectTo(baseUrl: string | undefined | null): string {
    const base = (baseUrl ?? "").trim().replace(/\/+$/, "");
    return `${base}${AUTH_ROUTES.newPassword}`;
}

// ─── Forgotten password: new password ───

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
 * Checks the password / confirmation pair before calling Supabase. An empty
 * field and a mismatch give different messages.
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
