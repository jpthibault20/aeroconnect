/**
 * Événement global (window) émis quand un solde change (paiement enregistré,
 * vol signé, correction). Navigation, calendrier et page portefeuille
 * l'écoutent pour se rafraîchir. Module sans dépendance UI, comme
 * maintenanceEvents.ts.
 */
export const WALLET_EVENT = "refresh-wallet";

export function emitWalletChanged(): void {
    if (typeof window !== "undefined") window.dispatchEvent(new Event(WALLET_EVENT));
}
