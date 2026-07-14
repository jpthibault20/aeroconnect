/**
 * Nom de l'événement global (window) émis quand la maintenance d'une machine
 * change (ajout/suppression de rappel ou d'intervention). La navigation
 * l'écoute pour recalculer la bulle de retard.
 *
 * Isolé dans son propre module (sans dépendance UI) pour ne pas tirer le code de
 * la modale — et notamment `@react-pdf/renderer` — dans le bundle de navigation.
 */
export const MAINTENANCE_ALERTS_EVENT = "refresh-maintenance-alerts";
