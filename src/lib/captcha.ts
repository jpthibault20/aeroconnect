/**
 * Captcha verification for public forms (discovery-flight booking).
 *
 * V1: DEFERRED. The slot and the server verification point are in place, but no
 * provider is wired: anti-spam currently relies on the hold TTL and the
 * anti-double-hold rule. When Cloudflare Turnstile (or hCaptcha) is enabled, just
 * set the environment variables and uncomment the siteverify call below.
 *
 * Expected env vars when the time comes:
 *   - NEXT_PUBLIC_TURNSTILE_SITE_KEY (client)
 *   - TURNSTILE_SECRET_KEY          (server, never exposed)
 */

const CAPTCHA_ENABLED = process.env.TURNSTILE_SECRET_KEY != null;

export async function verifyCaptcha(token: string | undefined): Promise<boolean> {
    // V1: captcha disabled => let it through.
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
