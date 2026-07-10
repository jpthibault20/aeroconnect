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

/**
 * Parse en toute sécurité le JSON `planes.maintenanceHistory` en tableau typé.
 * Retourne [] si null / invalide (jamais d'exception côté lecture).
 */
export function parseMaintenanceHistory(raw: unknown): MaintenanceIntervention[] {
    if (raw == null) return [];
    const parsed = maintenanceHistorySchema.safeParse(raw);
    return parsed.success ? parsed.data : [];
}
