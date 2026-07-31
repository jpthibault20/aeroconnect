/**
 * URL de base de l'application, pour construire les liens ABSOLUS des emails.
 *
 * Un lien sans domaine (« /dashboard?clubID=… ») est réécrit par les clients
 * mail en « http://dashboard/?clubID=… » : il ne mène nulle part. Tout lien
 * envoyé par email doit donc passer par ce helper.
 *
 * Deux variables coexistent historiquement dans le projet :
 *  - NEXT_PUBLIC_APP_URL : utilisée par les emails (mail.ts, bapteme.ts) ;
 *  - WEBSITE_LINK : utilisée par la redirection Supabase (forgotPassword).
 * On accepte les deux (NEXT_PUBLIC_APP_URL prioritaire) pour qu'un
 * environnement qui n'en configure qu'une reste fonctionnel.
 */

/**
 * Normalise une URL de base : espaces et slash(s) final(aux) retirés, schéma
 * ajouté s'il manque (sans schéma, un client mail retombe sur un lien relatif).
 * Renvoie "" si rien n'est configuré.
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
        // Sans domaine, les liens partent cassés silencieusement : on le signale
        // dans les logs serveur plutôt que de laisser passer.
        console.warn(
            "[appUrl] NEXT_PUBLIC_APP_URL (ou WEBSITE_LINK) n'est pas défini : les liens des emails seront relatifs, donc invalides."
        );
    }
    return url;
}
