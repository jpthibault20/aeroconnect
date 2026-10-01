import Image from "next/image";
import { Plane as PlaneIcon } from "lucide-react";
import { planeImagePublicUrl } from "@/lib/planeImage";
import { cn } from "@/lib/utils";

interface Props {
    // Raw path stored in the DB (planes.imagePath), not a URL.
    imagePath: string | null;
    // Used as alt text: the plane's name.
    name: string;
    // Size, rounding and fallback colors, provided by the caller so each context
    // keeps its shape (round in a table, rounded square in a card…).
    className?: string;
    iconClassName?: string;
    // Size hint for next/image. Adjust if the thumbnail gets much wider than 48 px.
    sizes?: string;
}

/**
 * Plane thumbnail: its photo, or the plane icon as a fallback.
 *
 * Centralizes both cases so a plane without a photo looks exactly as it did
 * before photos existed, and the fallback is not redeclared everywhere.
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
