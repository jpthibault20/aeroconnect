"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Plane as PlaneIcon, Trash2 } from "lucide-react";
import { deletePlaneImage, uploadPlaneImage } from "@/api/db/planes";
import {
    isPlaneImageMimeType,
    planeImagePublicUrl,
    validatePlaneImage,
} from "@/lib/planeImage";
import { Button } from "../ui/button";

interface Props {
    planeID: string;
    planeName: string;
    imagePath: string | null;
    // Reports the new path (or null after deletion) so the parent refreshes its list
    // without reloading the page.
    onChange: (imagePath: string | null) => void;
    disabled?: boolean;
}

// Browser resize target: beyond this nothing is gained on display (the largest
// thumbnail is ~600 px wide) and upload time suffers.
const MAX_WIDTH = 1600;
const MIN_WIDTH = 800;
// Target size after compression: margin under PLANE_IMAGE_MAX_BYTES (2 MB) to
// absorb the most detailed photos (foliage, hangar...) which compress worse than
// average.
const TARGET_BYTES = 1.2 * 1024 * 1024;
// Tried from best quality to most compact: the first attempt within budget is
// kept, at the current resolution.
const QUALITY_STEPS = [0.82, 0.7, 0.6, 0.5];

class UnsupportedImageFormatError extends Error {}

type OutputFormat = { mime: "image/webp" | "image/jpeg"; fileName: string };

let outputFormatPromise: Promise<OutputFormat> | null = null;

/**
 * Picks the encoding format once per page. iOS Safari decodes WebP but cannot
 * encode it: toBlob("image/webp") silently returns a PNG, which ignores the
 * quality setting and weighs several MB for a photo. JPEG is the fallback since
 * every browser encodes it with a real quality setting.
 */
function getOutputFormat(): Promise<OutputFormat> {
    outputFormatPromise ??= new Promise((resolve) => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        canvas.toBlob((blob) => {
            resolve(
                blob?.type === "image/webp"
                    ? { mime: "image/webp", fileName: "photo.webp" }
                    : { mime: "image/jpeg", fileName: "photo.jpg" }
            );
        }, "image/webp");
    });
    return outputFormatPromise;
}

/**
 * Resizes and re-encodes the image in the browser before upload.
 *
 * Lowers the quality, then the resolution if needed, until it fits under
 * TARGET_BYTES: a high-resolution phone photo does not always fit in a single
 * attempt at quality 0.82. Keeps the best attempt even if still over budget: the
 * server validation decides, rather than uploading an original of several dozen MB.
 *
 * Throws UnsupportedImageFormatError if the browser cannot decode the file at all
 * (unsupported HEIC/HEIF, or a photo too large for the phone's memory): the
 * caller then picks the message to show rather than attempting an upload bound
 * to fail.
 */
async function resizeImage(file: File): Promise<File> {
    const format = await getOutputFormat();

    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(file);
    } catch {
        throw new UnsupportedImageFormatError();
    }

    try {
        let width = Math.min(bitmap.width, MAX_WIDTH);
        let smallest: Blob | null = null;

        while (true) {
            const ratio = width / bitmap.width;
            const height = Math.max(1, Math.round(bitmap.height * ratio));

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            try {
                const context = canvas.getContext("2d");
                if (!context) break;
                context.drawImage(bitmap, 0, 0, width, height);

                for (const quality of QUALITY_STEPS) {
                    const blob = await new Promise<Blob | null>((resolve) =>
                        canvas.toBlob(resolve, format.mime, quality)
                    );
                    if (!blob) continue;
                    if (!smallest || blob.size < smallest.size) smallest = blob;
                    if (blob.size <= TARGET_BYTES) {
                        return new File([blob], format.fileName, { type: blob.type });
                    }
                }
            } finally {
                // iOS Safari caps the total canvas memory and only frees it lazily:
                // shrinking the canvas releases its buffer right away.
                canvas.width = 0;
                canvas.height = 0;
            }

            if (width <= MIN_WIDTH) break;
            width = Math.max(MIN_WIDTH, Math.round(width * 0.75));
        }

        // Nothing within budget: send the smallest attempt anyway, the server
        // validation decides.
        if (smallest) return new File([smallest], format.fileName, { type: smallest.type });
        return file;
    } finally {
        bitmap.close();
    }
}

// Detects a HEIC/HEIF file by MIME type (often empty on iOS) or extension, to
// give a specific explanation rather than a generic message when the browser
// cannot decode it.
function looksLikeHeic(file: File): boolean {
    return /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

const PlaneImageInput = ({ planeID, planeName, imagePath, onChange, disabled }: Props) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const imageUrl = planeImagePublicUrl(imagePath);

    const onSelectFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        // Reset the input right away: otherwise reselecting the same file after an error
        // fires no event.
        event.target.value = "";
        if (!file) return;

        setError("");
        setBusy(true);

        try {
            let payload = file;
            try {
                payload = await resizeImage(file);
            } catch (err) {
                if (err instanceof UnsupportedImageFormatError) {
                    setError(
                        looksLikeHeic(file)
                            ? "Ce format de photo (HEIC/HEIF) n'est pas lisible par ce navigateur. Sur iPhone : Réglages > Appareil photo > Formats > \"Le plus compatible\", puis reprenez la photo — ou choisissez une photo déjà au format JPEG."
                            : "Impossible de lire cette photo sur cet appareil (format non pris en charge ou photo trop grande). Réessayez avec une image JPEG, PNG ou WebP, ou une photo de plus petite taille."
                    );
                    return;
                }
                // Unexpected resize failure: try uploading as is, the validation below decides.
                payload = file;
            }

            if (!isPlaneImageMimeType(payload.type)) {
                setError("Format non supporté. Utilisez une image JPEG, PNG ou WebP.");
                return;
            }
            const invalid = validatePlaneImage({ type: payload.type, size: payload.size });
            if (invalid) {
                setError(invalid);
                return;
            }

            const formData = new FormData();
            formData.append("file", payload);

            const res = await uploadPlaneImage(planeID, formData);
            if ("error" in res) {
                setError(res.error ?? "Échec de l'envoi de la photo.");
                return;
            }
            onChange(res.imagePath ?? null);
        } catch (err) {
            const message = err instanceof Error ? err.message : "";
            setError(
                /body exceeded|payload too large|413/i.test(message)
                    ? "La photo est trop volumineuse pour être envoyée. Réessayez avec une autre photo."
                    : "Échec de l'envoi de la photo. Vérifiez votre connexion et réessayez."
            );
        } finally {
            setBusy(false);
        }
    };

    const onDelete = async () => {
        setError("");
        setBusy(true);
        try {
            const res = await deletePlaneImage(planeID);
            if ("error" in res) {
                setError(res.error ?? "Échec de la suppression de la photo.");
                return;
            }
            onChange(null);
        } catch {
            setError("Échec de la suppression de la photo.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-2">
            <div className="relative w-full aspect-[4/3] max-w-xs overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={`Photo de ${planeName}`}
                        fill
                        sizes="(max-width: 640px) 100vw, 320px"
                        className="object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300">
                        <PlaneIcon className="w-8 h-8" />
                        <span className="text-xs text-slate-400">Aucune photo</span>
                    </div>
                )}

                {busy && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                        <Loader2 className="w-6 h-6 animate-spin text-[#774BBE]" />
                    </div>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled || busy}
                    onClick={() => inputRef.current?.click()}
                    className="gap-2 text-slate-600"
                >
                    <ImagePlus className="w-4 h-4" />
                    {imagePath ? "Remplacer la photo" : "Ajouter une photo"}
                </Button>

                {imagePath && (
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={disabled || busy}
                        onClick={onDelete}
                        className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                    </Button>
                )}
            </div>

            <p className="text-xs text-slate-400">
                La photo est enregistrée immédiatement, sans attendre le bouton
                Enregistrer. Elle est visible des clients sur la page publique de
                réservation de baptême.
            </p>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onSelectFile}
            />
        </div>
    );
};

export default PlaneImageInput;
