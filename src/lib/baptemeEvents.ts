/**
 * Name of the global (window) event fired when a discovery-flight request is
 * handled (accepted or rejected). The navigation listens to it to recompute the
 * "Club" menu badge.
 *
 * Kept in its own module (no UI dependency) so no heavy code is pulled into the
 * navigation bundle.
 */
export const BAPTEME_REQUESTS_EVENT = "refresh-bapteme-requests";
