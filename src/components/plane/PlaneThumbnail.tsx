import Image from "next/image";
import { Plane as PlaneIcon } from "lucide-react";
import { planeImagePublicUrl } from "@/lib/planeImage";
import { cn } from "@/lib/utils";

interface Props {
    // Chemin brut stocké en base (planes.imagePath), pas une URL.
    imagePath: string | null;
    // Sert de texte alternatif : le nom de la machine.
    name: string;
    // Taille, arrondi et couleurs du repli — fournis par l'appelant pour que
    // chaque contexte garde son gabarit (rond dans un tableau, carré arrondi
    // dans une carte…).
    className?: string;
    iconClassName?: string;
    // Indication de taille pour next/image. À ajuster si la vignette dépasse
    // nettement 48 px de large.
    sizes?: string;
}

/**
 * Vignette d'une machine : sa photo, ou l'icône avion en repli.
 *
 * Centralise les deux cas pour qu'une machine sans photo garde exactement
 * l'apparence qu'elle avait avant l'arrivée des photos, et qu'on n'ait pas à
 * redéclarer le repli à chaque emplacement.
 */
const PlaneThumbnail = ({ imagePath, name, className, iconClassName, sizes = "48px" }: Props) => {
    const imageUrl = planeImagePublicUrl(imagePath);

    return (
        <div
            className={cn(
                "relative flex items-center justify-center overflow-hidden flex-shrink-0",
                className
            )}
        >
            {imageUrl ? (
                <Image src={imageUrl} alt={name} fill sizes={sizes} className="object-cover" />
            ) : (
                <PlaneIcon className={iconClassName} />
            )}
        </div>
    );
};

export default PlaneThumbnail;
