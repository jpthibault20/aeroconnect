/**
 * Name of the global (window) event fired when a plane's maintenance changes
 * (reminder or intervention added/removed). The navigation listens to it to
 * recompute the overdue badge.
 *
 * Kept in its own module (no UI dependency) so the dialog's code, notably
 * `@react-pdf/renderer`, is not pulled into the navigation bundle.
 */
export const MAINTENANCE_ALERTS_EVENT = "refresh-maintenance-alerts";
