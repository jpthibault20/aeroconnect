/**
 * Batch sending of email notifications triggered client-side after a successful
 * action (booking, unsubscribe, session deletion).
 *
 * The `src/lib/mail.ts` helpers throw on failure: without `await`, a `try/catch`
 * around a `Promise.all` does not catch them and the error ends up as an
 * unhandled rejection. Here each send is awaited independently and the number of
 * failures is returned, so the user is warned without undoing the saved action.
 */

type NotificationTask = Promise<unknown> | null | undefined | false | "";

export async function settleNotifications(tasks: NotificationTask[]): Promise<number> {
    const results = await Promise.allSettled(tasks.filter((t): t is Promise<unknown> => !!t));
    return results.filter((r) => r.status === "rejected").length;
}

/** Message shown when at least one notification could not be sent. */
export function notificationFailureMessage(failed: number): string | null {
    if (failed <= 0) return null;
    return failed === 1
        ? "L'opération est enregistrée, mais une notification e-mail n'a pas pu être envoyée."
        : `L'opération est enregistrée, mais ${failed} notifications e-mail n'ont pas pu être envoyées.`;
}

/**
 * Awaits the notifications then calls `warn` with a message if at least one
 * failed. `warn` is injected (toast in the component) to keep this module pure
 * and testable.
 */
export async function sendNotificationsOrWarn(
    tasks: NotificationTask[],
    warn: (message: string) => void
): Promise<void> {
    const message = notificationFailureMessage(await settleNotifications(tasks));
    if (message) warn(message);
}
