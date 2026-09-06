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
    // Remonte le nouveau chemin (ou null après suppression) pour que le parent
    // rafraîchisse sa liste sans recharger la page.
    onChange: (imagePath: string | null) => void;
    disabled?: boolean;
}

// Cible du redimensionnement navigateur : au-delà, on ne gagne rien à
// l'affichage (la plus grande vignette fait ~600 px de large) et on paie en
// temps d'envoi.
const MAX_WIDTH = 1600;
const MIN_WIDTH = 800;
// Budget visé après compression : marge sous PLANE_IMAGE_MAX_BYTES (2 Mo) pour
// absorber les photos les plus détaillées (feuillage, hangar...) qui
// compressent moins bien que la moyenne.
const TARGET_BYTES = 1.2 * 1024 * 1024;
// Essayés du plus qualitatif au plus compact : le premier essai qui tient dans
// le budget est retenu, à la résolution courante.
const QUALITY_STEPS = [0.82, 0.7, 0.6, 0.5];

class UnsupportedImageFormatError extends Error {}

/**
 * Redimensionne et ré-encode l'image dans le navigateur avant envoi.
 *
 * Descend la qualité puis, si besoin, la résolution jusqu'à passer sous
 * TARGET_BYTES — une photo de téléphone haute résolution ne tient pas toujours
 * en un seul essai à qualité 0.82. Garde le meilleur essai obtenu même s'il
 * dépasse encore le budget : la validation serveur tranchera, plutôt que
 * d'envoyer le fichier original de plusieurs dizaines de Mo.
 *
 * Lève UnsupportedImageFormatError si le navigateur ne sait pas du tout décoder
 * le fichier (HEIC/HEIF non pris en charge, par exemple) : l'appelant décide
 * alors du message à afficher plutôt que de tenter un envoi voué à l'échec.
 */
async function resizeImage(file: File): Promise<File> {
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
            const context = canvas.getContext("2d");
            if (!context) break;
            context.drawImage(bitmap, 0, 0, width, height);

            for (const quality of QUALITY_STEPS) {
                const blob = await new Promise<Blob | null>((resolve) =>
                    canvas.toBlob(resolve, "image/webp", quality)
                );
                if (!blob) continue;
                if (!smallest || blob.size < smallest.size) smallest = blob;
                if (blob.size <= TARGET_BYTES) {
                    return new File([blob], "photo.webp", { type: blob.type });
                }
            }

            if (width <= MIN_WIDTH) break;
            width = Math.max(MIN_WIDTH, Math.round(width * 0.75));
        }

        // Format illisible en WebP (vieux Safari) : les blobs produits sont
        // alors en PNG et bien plus lourds — on tente quand même le meilleur.
        if (smallest) return new File([smallest], "photo", { type: smallest.type });
        return file;
    } finally {
        bitmap.close();
    }
}

// Repère un fichier HEIC/HEIF au type MIME (souvent vide sur iOS) ou à
// l'extension, pour proposer une explication ciblée plutôt qu'un message
// générique quand le navigateur ne sait pas le décoder.
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
        // Réinitialise l'input tout de suite : sans ça, resélectionner le même
        // fichier après une erreur ne déclenche aucun évènement.
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
                            : "Ce format de photo n'est pas lisible par ce navigateur. Utilisez une image JPEG, PNG ou WebP."
                    );
                    return;
                }
                // Échec inattendu du redimensionnement : on tente l'envoi tel
                // quel, la validation ci-dessous tranchera.
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
