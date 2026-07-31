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
const WEBP_QUALITY = 0.82;

/**
 * Redimensionne et ré-encode l'image dans le navigateur avant envoi.
 *
 * Deux bénéfices : on reste très en dessous de la limite de corps des server
 * actions, et on normalise le format (plus de photo de 8 Mo sortie d'un
 * téléphone). Les navigateurs qui ne savent pas encoder en WebP retombent
 * silencieusement sur PNG — d'où le type lu sur le blob produit, jamais supposé.
 */
async function resizeImage(file: File): Promise<File> {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, MAX_WIDTH / bitmap.width);
    const width = Math.round(bitmap.width * ratio);
    const height = Math.round(bitmap.height * ratio);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
        bitmap.close();
        return file;
    }

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", WEBP_QUALITY)
    );
    if (!blob) return file;

    return new File([blob], "photo", { type: blob.type });
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
            } catch {
                // Format illisible par le navigateur (HEIC par exemple) : on
                // tente l'envoi tel quel, la validation ci-dessous tranchera.
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
        } catch {
            setError("Échec de l'envoi de la photo.");
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
