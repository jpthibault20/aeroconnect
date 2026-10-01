/**
 * Global (window) event fired when a balance changes (payment recorded, flight
 * signed, correction). Navigation, calendar and wallet page listen to it to
 * refresh. Module without UI dependency, like maintenanceEvents.ts.
 */
export const WALLET_EVENT = "refresh-wallet";

export function emitWalletChanged(): void {
    if (typeof window !== "undefined") window.dispatchEvent(new Event(WALLET_EVENT));
}
