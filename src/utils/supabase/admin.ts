import { createClient } from "@supabase/supabase-js";

/**
 * "Service role" Supabase client.
 *
 * ⚠️ SERVER ONLY. The key bypasses every policy: never import this module from a
 * client component, and never prefix the environment variable with NEXT_PUBLIC_.
 *
 * Used exclusively for file storage (plane photos). Writing is authorized by the
 * server action AFTER `requireAuth` + `canManagePlane` + the `clubID` check: as
 * everywhere else in the app, authorization lives in the code, not the database
 * (see CLAUDE.md).
 *
 * Returns null if the key is not configured, so the caller can return a clear
 * message rather than crash.
 */
export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) return null;

    return createClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}
