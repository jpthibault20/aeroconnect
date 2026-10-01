/**
 * Formats the pilot name as "J. thibault".
 */
export function formatPilotName(firstName: string, lastName: string): string {
    const formattedFirstName = lastName.charAt(0).toUpperCase();
    const formattedLastName = firstName.toLowerCase();
    return `${formattedFirstName}. ${formattedLastName}`;
}