import { FLIGHT_SESSION } from "@prisma/client";

/**
 * Fonction pour filtrer les sessions en fonction du filtre de l'instructeur et du filtre de l'avion
 * @param sessions Tableau de sessions de vol
 * @param instructorFilter Filtre de l'instructeur (nom complet ou null pour ignorer)
 * @param planeFilter Filtre de l'avion (nom de l'avion ou null pour ignorer)
 * @returns Un tableau filtré de sessions de vol
 */
export function filterFlightSessions(
    sessions: FLIGHT_SESSION[],
    instructorFilter: string | null,
    planeFilter: string | null
): FLIGHT_SESSION[] {
    return sessions.filter(session => {
        // Formater le nom complet de l'instructeur en minuscule
        const fullName = `${session.pilotLastName} ${session.pilotFirstName}`.toLowerCase();

        // Vérification du filtre de l'instructeur (si fourni)
        const instructorMatch = instructorFilter
            ? fullName === instructorFilter.toLowerCase() // Comparaison stricte (minuscule)
            : true; // Pas de filtre d'instructeur

        // Vérification du filtre de l'avion (si fourni)
        const planeMatch = planeFilter && session.planeName
            ? session.planeName.toLowerCase() === planeFilter.toLowerCase()
            : true; // Pas de filtre d'avion

        // Retourne vrai si les deux filtres correspondent
        return instructorMatch && planeMatch;
    });
}