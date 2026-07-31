import { describe, it, expect } from "vitest";
import {
    buildPlaneImagePath,
    isPlaneImageMimeType,
    isPlaneImagePathOwnedBy,
    PLANE_IMAGE_MAX_BYTES,
    planeImageExtension,
    planeImagePublicUrl,
    validatePlaneImage,
} from "@/lib/planeImage";

const SUPABASE_URL = "https://abcdef.supabase.co";

// ─── isPlaneImageMimeType / planeImageExtension ───

describe("isPlaneImageMimeType", () => {
    it("accepte webp, jpeg et png", () => {
        expect(isPlaneImageMimeType("image/webp")).toBe(true);
        expect(isPlaneImageMimeType("image/jpeg")).toBe(true);
        expect(isPlaneImageMimeType("image/png")).toBe(true);
    });

    it("refuse les autres formats", () => {
        expect(isPlaneImageMimeType("image/heic")).toBe(false);
        expect(isPlaneImageMimeType("image/svg+xml")).toBe(false);
        expect(isPlaneImageMimeType("application/pdf")).toBe(false);
        expect(isPlaneImageMimeType("")).toBe(false);
    });
});

describe("planeImageExtension", () => {
    it("associe la bonne extension à chaque type", () => {
        expect(planeImageExtension("image/webp")).toBe("webp");
        expect(planeImageExtension("image/jpeg")).toBe("jpg");
        expect(planeImageExtension("image/png")).toBe("png");
    });
});

// ─── validatePlaneImage ───

describe("validatePlaneImage", () => {
    it("accepte une image valide", () => {
        expect(validatePlaneImage({ type: "image/webp", size: 200_000 })).toBeNull();
    });

    it("refuse un format non supporté", () => {
        expect(validatePlaneImage({ type: "image/heic", size: 200_000 }))
            .toMatch(/Format non supporté/);
    });

    it("refuse un fichier vide", () => {
        expect(validatePlaneImage({ type: "image/png", size: 0 })).toMatch(/vide/);
    });

    it("refuse un fichier au-delà du plafond", () => {
        expect(validatePlaneImage({ type: "image/png", size: PLANE_IMAGE_MAX_BYTES + 1 }))
            .toMatch(/trop lourde/);
    });

    it("accepte un fichier pile au plafond", () => {
        expect(validatePlaneImage({ type: "image/png", size: PLANE_IMAGE_MAX_BYTES })).toBeNull();
    });
});

// ─── buildPlaneImagePath / isPlaneImagePathOwnedBy ───

describe("buildPlaneImagePath", () => {
    it("préfixe par l'id de la machine et suffixe par l'extension", () => {
        expect(buildPlaneImagePath("plane-1", "uuid-abc", "image/webp"))
            .toBe("plane-1/uuid-abc.webp");
        expect(buildPlaneImagePath("plane-1", "uuid-abc", "image/jpeg"))
            .toBe("plane-1/uuid-abc.jpg");
    });

    it("produit un chemin reconnu comme appartenant à la machine", () => {
        const path = buildPlaneImagePath("plane-1", "uuid-abc", "image/png");
        expect(isPlaneImagePathOwnedBy(path, "plane-1")).toBe(true);
    });
});

describe("isPlaneImagePathOwnedBy", () => {
    it("refuse le chemin d'une autre machine", () => {
        expect(isPlaneImagePathOwnedBy("plane-2/uuid.webp", "plane-1")).toBe(false);
    });

    it("refuse un préfixe partiel (plane-1 ne possède pas plane-10)", () => {
        expect(isPlaneImagePathOwnedBy("plane-10/uuid.webp", "plane-1")).toBe(false);
    });

    it("refuse un chemin sans dossier", () => {
        expect(isPlaneImagePathOwnedBy("uuid.webp", "plane-1")).toBe(false);
    });
});

// ─── planeImagePublicUrl ───

describe("planeImagePublicUrl", () => {
    it("construit l'URL publique du bucket", () => {
        expect(planeImagePublicUrl("plane-1/uuid.webp", SUPABASE_URL))
            .toBe("https://abcdef.supabase.co/storage/v1/object/public/planes/plane-1/uuid.webp");
    });

    it("tolère une URL Supabase terminée par un slash", () => {
        expect(planeImagePublicUrl("plane-1/uuid.webp", "https://abcdef.supabase.co/"))
            .toBe("https://abcdef.supabase.co/storage/v1/object/public/planes/plane-1/uuid.webp");
    });

    it("renvoie null sans chemin (machine sans photo)", () => {
        expect(planeImagePublicUrl(null, SUPABASE_URL)).toBeNull();
        expect(planeImagePublicUrl(undefined, SUPABASE_URL)).toBeNull();
        expect(planeImagePublicUrl("", SUPABASE_URL)).toBeNull();
    });

    it("renvoie null si l'URL Supabase n'est pas configurée", () => {
        expect(planeImagePublicUrl("plane-1/uuid.webp", undefined)).toBeNull();
    });
});
