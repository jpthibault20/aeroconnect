/**
 * Envoi groupé des notifications e-mail déclenchées côté client après une
 * action réussie (réservation, désinscription, suppression de session).
 *
 * Les helpers de `src/lib/mail.ts` lèvent une exception en cas d'échec : sans
 * `await`, un `try/catch` autour d'un `Promise.all` ne les intercepte pas et
 * l'erreur finit en rejet non géré. Ici, chaque envoi est attendu
 * indépendamment et on renvoie le nombre d'échecs, pour prévenir l'utilisateur
 * sans annuler l'action déjà enregistrée.
 */

type NotificationTask = Promise<unknown> | null | undefined | false | "";

export async function settleNotifications(tasks: NotificationTask[]): Promise<number> {
    const results = await Promise.allSettled(tasks.filter((t): t is Promise<unknown> => !!t));
    return results.filter((r) => r.status === "rejected").length;
}

/** Message affiché quand au moins une notification n'a pas pu partir. */
export function notificationFailureMessage(failed: number): string | null {
    if (failed <= 0) return null;
    return failed === 1
        ? "L'opération est enregistrée, mais une notification e-mail n'a pas pu être envoyée."
        : `L'opération est enregistrée, mais ${failed} notifications e-mail n'ont pas pu être envoyées.`;
}

/**
 * Attend les notifications puis appelle `warn` avec un message si au moins une
 * a échoué. `warn` est injecté (toast côté composant) pour garder ce module
 * pur et testable.
 */
export async function sendNotificationsOrWarn(
    tasks: NotificationTask[],
    warn: (message: string) => void
): Promise<void> {
    const message = notificationFailureMessage(await settleNotifications(tasks));
    if (message) warn(message);
}
