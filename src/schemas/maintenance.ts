import { z } from "zod";

/**
 * Shape of a maintenance intervention stored in the `planes.maintenanceHistory`
 * JSON column (an array of these objects).
 *
 * JSON storage (rather than a separate table) is deliberate: it keeps an
 * unbreakable link between the plane and its maintenance history (no cascade
 * delete, no join). The flip side is there is no SQL constraint: validation is
 * entirely application-side, through this zod schema, on both read and write.
 */

// Intervention types. Deliberately broad (to be refined with the club). `type`
// stays a free string so nothing is blocked.
export const MAINTENANCE_TYPES = [
    "VIDANGE",
    "REVISION",
    "REPARATION",
    "VISITE_ANNUELLE",
    "PESEE",
    "AUTRE",
] as const;

export const maintenanceInterventionSchema = z.object({
    // Intervention ID (uuid generated server-side on add).
    id: z.string(),
    // Intervention date (ISO 8601).
    date: z.string(),
    // Maintenance type (see MAINTENANCE_TYPES; free string to stay flexible).
    type: z.string().min(1),
    // What was done.
    description: z.string().min(1),
    // Optional comment.
    comment: z.string().optional(),
    // Hobbs hours at the time of the intervention (snapshot of hobbsTotal).
    engineHours: z.number().nullable(),
    // Author of the entry (denormalized to survive account deletions).
    createdById: z.string(),
    createdByName: z.string(),
    // Entry creation timestamp (ISO 8601).
    createdAt: z.string(),
});

export type MaintenanceIntervention = z.infer<typeof maintenanceInterventionSchema>;

export const maintenanceHistorySchema = z.array(maintenanceInterventionSchema);

// ─── Form inputs (validated client- AND server-side) ───

/**
 * Intervention input (the denormalized id/author/createdAt fields are added
 * server-side; only what the user enters is validated here).
 */
export const interventionInputSchema = z.object({
    date: z.string().min(1, "Date requise"),
    type: z.string().min(1, "Type requis"),
    description: z.string().min(1, "Description requise"),
    comment: z.string().optional(),
    // Hobbs hours at the time of the intervention (may be empty => null).
    engineHours: z.number().nullable(),
    // Reminder possibly closed by this intervention (resets its counter).
    // undefined => no link.
    taskID: z.string().optional(),
});

export type InterventionInput = z.infer<typeof interventionInputSchema>;

/**
 * Recurring reminder input (MaintenanceTask). At least one limit (hours OR
 * months) is required, validated by `refine`.
 */
export const taskInputSchema = z
    .object({
        title: z.string().min(1, "Intitulé requis"),
        intervalHours: z.number().positive().nullable(),
        intervalMonths: z.number().int().positive().nullable(),
        // Counter starting reference (last known completion).
        lastPerformedDate: z.string().min(1, "Date de référence requise"),
        lastPerformedHobbs: z.number(),
    })
    .refine((d) => d.intervalHours != null || d.intervalMonths != null, {
        message: "Renseignez une périodicité en heures et/ou en mois",
        path: ["intervalHours"],
    });

export type TaskInput = z.infer<typeof taskInputSchema>;

/**
 * Safely parses the `planes.maintenanceHistory` JSON into a typed array.
 * Returns [] if null / invalid (never throws on read).
 */
export function parseMaintenanceHistory(raw: unknown): MaintenanceIntervention[] {
    if (raw == null) return [];
    const parsed = maintenanceHistorySchema.safeParse(raw);
    return parsed.success ? parsed.data : [];
}
