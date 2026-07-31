/**
 * Vérification de captcha pour les formulaires publics (réservation baptême).
 *
 * V1 : DIFFÉRÉ. L'emplacement et le point de vérification serveur sont en place,
 * mais aucun fournisseur n'est branché — la protection anti-spam repose pour
 * l'instant sur le TTL du hold et l'anti-double-hold. Le jour où l'on active
 * Cloudflare Turnstile (ou hCaptcha), il suffit de renseigner les variables
 * d'environnement et de dé-commenter l'appel siteverify ci-dessous.
 *
 * Env attendues le moment venu :
 *   - NEXT_PUBLIC_TURNSTILE_SITE_KEY (client)
 *   - TURNSTILE_SECRET_KEY          (serveur, jamais exposée)
 */

const CAPTCHA_ENABLED = process.env.TURNSTILE_SECRET_KEY != null;

export async function verifyCaptcha(token: string | undefined): Promise<boolean> {
    // V1 : captcha désactivé => on laisse passer.
    if (!CAPTCHA_ENABLED) return true;

    if (!token) return false;

    try {
        const res = await fetch(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    secret: process.env.TURNSTILE_SECRET_KEY as string,
                    response: token,
                }),
            }
        );
        const data = (await res.json()) as { success: boolean };
        return data.success === true;
    } catch {
        return false;
    }
}
