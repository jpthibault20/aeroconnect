import { describe, expect, it } from "vitest";
import { notificationFailureMessage, sendNotificationsOrWarn, settleNotifications } from "../notifications";

describe("settleNotifications", () => {
    it("compte les envois en échec sans lever d'exception", async () => {
        const failed = await settleNotifications([
            Promise.resolve("ok"),
            Promise.reject(new Error("Resend KO")),
            Promise.reject(new Error("Club introuvable")),
        ]);
        expect(failed).toBe(2);
    });

    it("ignore les envois absents (destinataire sans e-mail)", async () => {
        expect(await settleNotifications([null, undefined, false, "", Promise.resolve()])).toBe(0);
    });

    it("renvoie 0 sans notification", async () => {
        expect(await settleNotifications([])).toBe(0);
    });
});

describe("notificationFailureMessage", () => {
    it("ne dit rien quand tout est parti", () => {
        expect(notificationFailureMessage(0)).toBeNull();
    });

    it("accorde le message au nombre d'échecs", () => {
        expect(notificationFailureMessage(1)).toContain("une notification");
        expect(notificationFailureMessage(3)).toContain("3 notifications");
    });
});

describe("sendNotificationsOrWarn", () => {
    it("prévient une seule fois en cas d'échec", async () => {
        const warnings: string[] = [];
        await sendNotificationsOrWarn([Promise.reject(new Error("KO")), Promise.resolve()], (m) => warnings.push(m));
        expect(warnings).toHaveLength(1);
    });

    it("reste silencieux quand tout est parti", async () => {
        const warnings: string[] = [];
        await sendNotificationsOrWarn([Promise.resolve()], (m) => warnings.push(m));
        expect(warnings).toHaveLength(0);
    });
});
