import { describe, it, expect } from "vitest";
import { render } from "@react-email/render";
import MagicLinkEmail from "@/emails/MagicLink";

/**
 * Sign-up confirmation email (`sendVerificationEmail`).
 *
 * ⚠ This template is currently not wired to any flow: account creation relies on
 * the email sent by Supabase (`supabase.auth.signUp`). These tests lock its
 * rendering for when it is put back into service, especially the link, which
 * must stay ABSOLUTE (see lib/appUrl).
 */
const clubAdress = {
    countrie: "France",
    zipCode: "34000",
    city: "Montpellier",
    adress: "Aérodrome",
};

describe("Email de confirmation d'inscription", () => {
    it("contient le lien de confirmation, cliquable", async () => {
        const html = await render(
            MagicLinkEmail({
                magicLink: "https://aeroconnect.fr/auth/new-verification?token=abc",
                clubName: "Aéroclub Test",
                clubAdress,
            })
        );
        expect(html).toContain('href="https://aeroconnect.fr/auth/new-verification?token=abc"');
        expect(html).toContain("Lien de confirmation");
    });

    it("affiche le nom du club", async () => {
        const html = await render(
            MagicLinkEmail({ magicLink: "https://x.fr", clubName: "Aéroclub Test", clubAdress })
        );
        expect(html).toContain("Aéroclub Test");
    });

    it("invite à ignorer l'email si la demande n'émane pas du destinataire", async () => {
        const html = await render(
            MagicLinkEmail({ magicLink: "https://x.fr", clubName: "Aéroclub Test", clubAdress })
        );
        expect(html).toContain("ignorer cet e-mail");
    });

    it("ne casse pas si le nom du club est absent", async () => {
        const html = await render(
            MagicLinkEmail({ magicLink: "https://x.fr", clubName: null, clubAdress })
        );
        expect(html).toContain("Lien de confirmation");
    });

    it("régression : un lien sans domaine partirait relatif, donc cassé", async () => {
        // Symptom already seen on the discovery-flight link ("http://dashboard/…"): if
        // the link passed here is not absolute, the mail client rewrites it.
        const html = await render(
            MagicLinkEmail({
                magicLink: "/auth/new-verification?token=abc",
                clubName: "Aéroclub Test",
                clubAdress,
            })
        );
        const href = html.match(/href="([^"]*new-verification[^"]*)"/)?.[1] ?? "";
        expect(href.startsWith("http")).toBe(false);
    });
});
