import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase « service role ».
 *
 * ⚠️ SERVEUR UNIQUEMENT. La clé contourne toutes les policies : ne jamais
 * importer ce module depuis un composant client, et ne jamais préfixer la
 * variable d'environnement par NEXT_PUBLIC_.
 *
 * Sert exclusivement au stockage de fichiers (photos de machines). L'écriture
 * est autorisée par le server action APRÈS `requireAuth` + `canManagePlane` +
 * contrôle du `clubID` — comme partout ailleurs dans l'app, l'autorisation vit
 * dans le code, pas dans la base (cf. CLAUDE.md).
 *
 * Retourne null si la clé n'est pas configurée, pour que l'appelant puisse
 * renvoyer un message clair plutôt que de planter.
 */
export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) return null;

    return createClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}
