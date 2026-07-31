import { describe, it, expect } from "vitest";
import { render } from "@react-email/render";
import MagicLinkEmail from "@/emails/MagicLink";

/**
 * Email de confirmation d'inscription (`sendVerificationEmail`).
 *
 * ⚠ Ce template n'est actuellement branché à aucun flux : la création de compte
 * s'appuie sur l'email envoyé par Supabase (`supabase.auth.signUp`). Les tests
 * ci-dessous verrouillent son rendu pour le jour où il sera remis en service —
 * en particulier le lien, qui doit rester ABSOLU (cf. lib/appUrl).
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
        // Symptôme déjà rencontré sur le lien baptême (« http://dashboard/… ») :
        // si le lien passé ici n'est pas absolu, le client mail le réécrit.
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
