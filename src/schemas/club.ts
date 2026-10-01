import { z } from "zod";

/**
 * New club form. Validated client-side (NewClub) AND server-side (createClub):
 * the server action is callable directly, so the client check alone proves
 * nothing.
 */
export const clubFormSchema = z.object({
    name: z.string().min(1, "Le nom du club est requis"),
    id: z.string().min(3, "L'ID du club doit faire 3 caractères min.").toUpperCase(),
    address: z.string().optional(),
    city: z.string().optional(),
    zipCode: z.string().optional(),
    workStartTime: z.string({ required_error: "Heure d'ouverture requise" }).min(1, "Heure d'ouverture requise"),
    workEndTime: z.string({ required_error: "Heure de fermeture requise" }).min(1, "Heure de fermeture requise"),
    sessionDuration: z.number().default(60)
}).refine(
    (data) => parseInt(data.workEndTime) - parseInt(data.workStartTime) >= 3,
    {
        path: ["workEndTime"],
        message: "La journée doit durer au moins 3h.",
    }
);

export type ClubFormValues = z.infer<typeof clubFormSchema>;
