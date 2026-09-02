import { z } from "zod";

/**
 * Schéma de validation de la demande publique de réservation d'un baptême.
 * Validé côté client (react-hook-form) ET côté serveur (createBaptemeRequest),
 * conformément à la convention (cf. src/schemas/maintenance.ts).
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
    // Formule (durée + tarif) choisie, si la machine en propose. Vide si la
    // machine n'a aucune formule configurée (aucun choix à faire dans ce cas).
    baptemeOptionID: z.string().optional().or(z.literal("")),
});

export type BaptemeRequestSchema = z.infer<typeof baptemeRequestSchema>;
