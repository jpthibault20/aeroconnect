/**
 * Nom de l'événement global (window) émis quand une demande de baptême est
 * traitée (validée ou refusée). La navigation l'écoute pour recalculer la bulle
 * de notification du menu « Club ».
 *
 * Isolé dans son propre module (sans dépendance UI) pour ne pas tirer de code
 * lourd dans le bundle de navigation.
 */
export const BAPTEME_REQUESTS_EVENT = "refresh-bapteme-requests";
