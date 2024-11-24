/**
 * Fonction pour formater le nom du pilote en "J. thibault"
 * @param firstName Prénom du pilote
 * @param lastName Nom de famille du pilote
 * @returns Le nom formaté "J. thibault"
 */
export function formatPilotName(firstName: string, lastName: string): string {
    const formattedFirstName = lastName.charAt(0).toUpperCase(); // Première lettre du prénom en majuscule
    const formattedLastName = firstName.toLowerCase(); // Nom de famille en minuscule
    return `${formattedFirstName}. ${formattedLastName}`;
}