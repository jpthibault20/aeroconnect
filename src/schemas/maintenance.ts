import { z } from "zod";

/**
 * Forme d'une intervention de maintenance stockée dans la colonne JSON
 * `planes.maintenanceHistory` (un tableau de ces objets).
 *
 * Le stockage en JSON (plutôt qu'une table séparée) est volontaire : il garde
 * un lien indestructible entre la machine et son historique de maintenance
 * (pas de suppression en cascade, pas de jointure). Le revers est qu'il n'y a
 * pas de contrainte SQL : la validation est donc entièrement applicative, via
 * ce schéma zod, aussi bien en lecture qu'en écriture.
 *
 * La page maintenance et les actions d'ajout arrivent au prochain ticket : ici
 * on prépare uniquement la structure de données et sa validation.
 */

// Types d'intervention. Volontairement large (le prochain ticket affinera la
// liste avec le club). `type` reste une chaîne libre pour ne rien bloquer.
export const MAINTENANCE_TYPES = [
    "VIDANGE",
    "REVISION",
    "REPARATION",
    "VISITE_ANNUELLE",
    "PESEE",
    "AUTRE",
] as const;

export const maintenanceInterventionSchema = z.object({
    // Identifiant de l'intervention (uuid généré côté serveur à l'ajout).
    id: z.string(),
    // Date de l'intervention (ISO 8601).
    date: z.string(),
    // Type de maintenance (cf. MAINTENANCE_TYPES ; chaîne libre pour rester souple).
    type: z.string().min(1),
    // Ce qui a été fait.
    description: z.string().min(1),
    // Commentaire optionnel.
    comment: z.string().optional(),
    // Heures moteur au moment de l'intervention (snapshot de hobbsTotal).
    engineHours: z.number().nullable(),
    // Auteur de la saisie (dénormalisé pour survivre aux suppressions de compte).
    createdById: z.string(),
    createdByName: z.string(),
    // Horodatage de création de l'entrée (ISO 8601).
    createdAt: z.string(),
});

export type MaintenanceIntervention = z.infer<typeof maintenanceInterventionSchema>;

export const maintenanceHistorySchema = z.array(maintenanceInterventionSchema);

// ─── Entrées de formulaire (validées côté client ET serveur) ───

/**
 * Saisie d'une intervention (les champs dénormalisés id/auteur/createdAt sont
 * ajoutés côté serveur ; on ne valide ici que ce que l'utilisateur saisit).
 */
export const interventionInputSchema = z.object({
    date: z.string().min(1, "Date requise"),
    type: z.string().min(1, "Type requis"),
    description: z.string().min(1, "Description requise"),
    comment: z.string().optional(),
    // Heures moteur au moment de l'intervention (peut être vide => null).
    engineHours: z.number().nullable(),
    // Rappel éventuellement clôturé par cette intervention (réinitialise son
    // compteur). undefined => aucune association.
    taskID: z.string().optional(),
});

export type InterventionInput = z.infer<typeof interventionInputSchema>;

/**
 * Saisie d'un rappel récurrent (MaintenanceTask). Au moins une borne
 * (heures OU mois) est requise — validé par `refine`.
 */
export const taskInputSchema = z
    .object({
        title: z.string().min(1, "Intitulé requis"),
        intervalHours: z.number().positive().nullable(),
        intervalMonths: z.number().int().positive().nullable(),
        // Référence de départ du compteur (dernière réalisation connue).
        lastPerformedDate: z.string().min(1, "Date de référence requise"),
        lastPerformedHobbs: z.number(),
    })
    .refine((d) => d.intervalHours != null || d.intervalMonths != null, {
        message: "Renseignez une périodicité en heures et/ou en mois",
        path: ["intervalHours"],
    });

export type TaskInput = z.infer<typeof taskInputSchema>;

/**
 * Parse en toute sécurité le JSON `planes.maintenanceHistory` en tableau typé.
 * Retourne [] si null / invalide (jamais d'exception côté lecture).
 */
export function parseMaintenanceHistory(raw: unknown): MaintenanceIntervention[] {
    if (raw == null) return [];
    const parsed = maintenanceHistorySchema.safeParse(raw);
    return parsed.success ? parsed.data : [];
}
