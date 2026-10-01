import { z } from "zod";

/**
 * Discovery-flight package (duration + price) configured on a club plane.
 * Validated client-side (management form) AND server-side
 * (src/api/db/baptemeOptions.ts), same convention as src/schemas/maintenance.ts.
 */
export const baptemeOptionInputSchema = z.object({
    durationMin: z.number().int().positive("La durée doit être un nombre de minutes positif"),
    price: z.number().nonnegative("Le tarif ne peut pas être négatif"),
});

export type BaptemeOptionInput = z.infer<typeof baptemeOptionInputSchema>;
