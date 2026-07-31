/**
 * Photo d'une machine : règles pures (chemin de stockage, URL publique,
 * validation du fichier).
 *
 * Le fichier vit dans un bucket PUBLIC de Supabase Storage. La base ne stocke
 * que le CHEMIN (`planes.imagePath`), jamais l'URL complète : le projet ou le
 * bucket peuvent changer sans réécrire une seule ligne de données.
 *
 * Le nom du fichier embarque un identifiant aléatoire régénéré à chaque envoi
 * (`{planeID}/{uuid}.{ext}`). Conséquence utile : remplacer la photo change
 * l'URL, donc aucun cache (navigateur, CDN, next/image) à invalider — et
 * l'ancien fichier est supprimé dans la foulée par le server action.
 *
 * Attention : bucket public = quiconque connaît l'URL voit l'image, même sans
 * lien de réservation. Les chemins ne sont pas devinables (uuid), mais ces
 * photos ne sont pas des données confidentielles. Pour rendre une photo
 * réellement privée il faudrait passer par des URL signées.
 */

// Bucket Supabase Storage hébergeant les photos (à créer en public côté
// dashboard Supabase).
export const PLANE_IMAGE_BUCKET = "planes";

// Taille maximale acceptée par le serveur, APRÈS redimensionnement côté client
// (qui vise ~200 Ko). La marge absorbe les cas où le navigateur ne sait pas
// ré-encoder en WebP. Reste sous la limite par défaut des server actions (1 Mo)
// serait trop juste : on relève donc explicitement ce plafond côté client.
export const PLANE_IMAGE_MAX_BYTES = 3 * 1024 * 1024;

// Types acceptés. WebP est la cible du redimensionnement ; JPEG et PNG sont
// conservés en repli pour les navigateurs qui ne savent pas encoder en WebP
// (vieux Safari retombe silencieusement sur PNG).
export const PLANE_IMAGE_MIME_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;

export type PlaneImageMimeType = (typeof PLANE_IMAGE_MIME_TYPES)[number];

const EXTENSION_BY_MIME: Record<PlaneImageMimeType, string> = {
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/png": "png",
};

export function isPlaneImageMimeType(mime: string): mime is PlaneImageMimeType {
    return (PLANE_IMAGE_MIME_TYPES as readonly string[]).includes(mime);
}

// Extension de fichier associée à un type MIME accepté.
export function planeImageExtension(mime: PlaneImageMimeType): string {
    return EXTENSION_BY_MIME[mime];
}

/**
 * Valide un fichier avant envoi. Appliquée deux fois : côté client pour un
 * message immédiat, côté serveur parce que le client n'est jamais une barrière.
 * Retourne un message d'erreur, ou null si le fichier est acceptable.
 */
export function validatePlaneImage(file: { type: string; size: number }): string | null {
    if (!isPlaneImageMimeType(file.type)) {
        return "Format non supporté. Utilisez une image JPEG, PNG ou WebP.";
    }
    if (file.size <= 0) {
        return "Le fichier est vide.";
    }
    if (file.size > PLANE_IMAGE_MAX_BYTES) {
        const maxMo = Math.round(PLANE_IMAGE_MAX_BYTES / (1024 * 1024));
        return `L'image est trop lourde (maximum ${maxMo} Mo).`;
    }
    return null;
}

/**
 * Chemin de stockage d'une photo. `fileID` doit être aléatoire (uuid) : c'est
 * lui qui rend l'URL non devinable et qui évite les collisions de cache.
 */
export function buildPlaneImagePath(planeID: string, fileID: string, mime: PlaneImageMimeType): string {
    return `${planeID}/${fileID}.${planeImageExtension(mime)}`;
}

/**
 * Une machine ne peut supprimer/remplacer que SES propres fichiers. Garde-fou
 * contre un `imagePath` corrompu en base qui ferait supprimer le fichier d'une
 * autre machine.
 */
export function isPlaneImagePathOwnedBy(imagePath: string, planeID: string): boolean {
    return imagePath.startsWith(`${planeID}/`);
}

/**
 * URL publique d'une photo. `supabaseUrl` est injectable pour les tests ; en
 * production elle vient de NEXT_PUBLIC_SUPABASE_URL (donc disponible aussi bien
 * côté serveur que côté navigateur).
 */
export function planeImagePublicUrl(
    imagePath: string | null | undefined,
    supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL
): string | null {
    if (!imagePath || !supabaseUrl) return null;
    const base = supabaseUrl.replace(/\/+$/, "");
    return `${base}/storage/v1/object/public/${PLANE_IMAGE_BUCKET}/${imagePath}`;
}
