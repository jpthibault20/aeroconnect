/**
 * Plane photo: pure rules (storage path, public URL, file validation).
 *
 * The file lives in a PUBLIC Supabase Storage bucket. The DB only stores the
 * PATH (`planes.imagePath`), never the full URL: the project or bucket can change
 * without rewriting a single data row.
 *
 * The file name embeds a random ID regenerated on every upload
 * (`{planeID}/{uuid}.{ext}`). Useful consequence: replacing the photo changes the
 * URL, so there is no cache (browser, CDN, next/image) to invalidate, and the old
 * file is deleted right away by the server action.
 *
 * Caution: public bucket = anyone who knows the URL sees the image, even without
 * a booking link. Paths are not guessable (uuid), but these photos are not
 * confidential data. Making a photo truly private would require signed URLs.
 */

// Supabase Storage bucket holding the photos (create it as public in the
// Supabase dashboard).
export const PLANE_IMAGE_BUCKET = "planes";

// Max size accepted by the server, AFTER client-side resizing (which targets
// ~1.2 MB, see PlaneImageInput). The margin absorbs cases where the browser
// cannot re-encode to WebP. Capped at 2 MB to limit the bucket's volume. The
// default Server Actions limit (1 MB) is explicitly raised in next.config.mjs to
// allow it.
export const PLANE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

// Accepted types. WebP is the resize target; JPEG and PNG are kept as fallbacks
// for browsers that cannot encode WebP (old Safari silently falls back to PNG).
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

// File extension for an accepted MIME type.
export function planeImageExtension(mime: PlaneImageMimeType): string {
    return EXTENSION_BY_MIME[mime];
}

/**
 * Validates a file before upload. Applied twice: client-side for an immediate
 * message, server-side because the client is never a barrier.
 * Returns an error message, or null if the file is acceptable.
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
 * Storage path of a photo. `fileID` must be random (uuid): it makes the URL
 * unguessable and avoids cache collisions.
 */
export function buildPlaneImagePath(planeID: string, fileID: string, mime: PlaneImageMimeType): string {
    return `${planeID}/${fileID}.${planeImageExtension(mime)}`;
}

/**
 * A plane can only delete/replace ITS OWN files. Safeguard against a corrupted
 * `imagePath` in the DB that would delete another plane's file.
 */
export function isPlaneImagePathOwnedBy(imagePath: string, planeID: string): boolean {
    return imagePath.startsWith(`${planeID}/`);
}

/**
 * Public URL of a photo. `supabaseUrl` is injectable for tests; in production it
 * comes from NEXT_PUBLIC_SUPABASE_URL (so available both server-side and in the
 * browser).
 */
export function planeImagePublicUrl(
    imagePath: string | null | undefined,
    supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL
): string | null {
    if (!imagePath || !supabaseUrl) return null;
    const base = supabaseUrl.replace(/\/+$/, "");
    return `${base}/storage/v1/object/public/${PLANE_IMAGE_BUCKET}/${imagePath}`;
}
