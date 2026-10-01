import { z } from "zod";

/**
 * Validation schema of the public discovery-flight booking request.
 * Validated client-side (react-hook-form) AND server-side (createBaptemeRequest),
 * per the convention (see src/schemas/maintenance.ts).
 */
export const baptemeRequestSchema = z.object({
    firstName: z.string().min(2, "Le prénom doit comporter au moins 2 caractères"),
    lastName: z.string().min(2, "Le nom doit comporter au moins 2 caractères"),
    email: z.string().email("L'adresse e-mail est invalide"),
    phone: z
        .string()
        .min(6, "Le numéro de téléphone est invalide")
        .max(20, "Le numéro de téléphone est invalide"),
    comment: z
        .string()
        .max(1000, "Le commentaire est trop long (1000 caractères maximum)")
        .optional()
        .or(z.literal("")),
    sessionID: z.string().min(1, "Veuillez choisir un créneau"),
    planeID: z.string().min(1, "Veuillez choisir un appareil"),
    // Chosen package (duration + price), if the plane offers some. Empty if the
    // plane has no package configured (no choice to make then).
    baptemeOptionID: z.string().optional().or(z.literal("")),
});

export type BaptemeRequestSchema = z.infer<typeof baptemeRequestSchema>;
