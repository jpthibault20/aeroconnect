import { z } from "zod";

/**
 * Formule de vol baptême (durée + tarif) configurée sur une machine du club.
 * Validée côté client (formulaire de gestion) ET côté serveur
 * (src/api/db/baptemeOptions.ts), même convention que src/schemas/maintenance.ts.
 */
export const baptemeOptionInputSchema = z.object({
    durationMin: z.number().int().positive("La durée doit être un nombre de minutes positif"),
    price: z.number().nonnegative("Le tarif ne peut pas être négatif"),
});

export type BaptemeOptionInput = z.infer<typeof baptemeOptionInputSchema>;
