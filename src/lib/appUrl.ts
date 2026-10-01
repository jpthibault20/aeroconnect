/**
 * Base URL of the app, to build ABSOLUTE links in emails.
 *
 * A link without a domain ("/dashboard?clubID=…") is rewritten by mail clients as
 * "http://dashboard/?clubID=…" and leads nowhere. Every link sent by email must
 * therefore go through this helper.
 *
 * Two variables historically coexist in the project:
 *  - NEXT_PUBLIC_APP_URL: used by the emails (mail.ts, bapteme.ts);
 *  - WEBSITE_LINK: used by the Supabase redirect (forgotPassword).
 * Both are accepted (NEXT_PUBLIC_APP_URL first) so an environment configuring
 * only one keeps working.
 */

/**
 * Normalizes a base URL: trims spaces and trailing slash(es), adds the scheme if
 * missing (without a scheme a mail client falls back to a relative link).
 * Returns "" if nothing is configured.
 */
export function normalizeBaseUrl(raw: string | undefined | null): string {
    const value = (raw ?? "").trim().replace(/\/+$/, "");
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    return `https://${value}`;
}

let warned = false;

export function appUrl(): string {
    const url = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL ?? process.env.WEBSITE_LINK);
    if (!url && !warned) {
        warned = true;
        // Without a domain, links go out silently broken: flag it in the server logs
        // rather than letting it through.
        console.warn(
            "[appUrl] NEXT_PUBLIC_APP_URL (ou WEBSITE_LINK) n'est pas défini : les liens des emails seront relatifs, donc invalides."
        );
    }
    return url;
}
