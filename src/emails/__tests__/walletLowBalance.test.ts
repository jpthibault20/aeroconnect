import { describe, it, expect } from "vitest";
import { render } from "@react-email/render";
import WalletLowBalance from "@/emails/WalletLowBalance";

/**
 * E-mail « solde faible / épuisé » (AER-66) : doit expliquer la situation et
 * donner le moyen de recharger (contact du club + lien absolu).
 */
const baseProps = {
    firstName: "Léa",
    balance: "25,00 €",
    isEmpty: false,
    contactName: "Marc LEFÈVRE",
    phoneContact: "0612345678",
    mailContact: "contact@club.fr",
    walletLink: "https://app.example.fr/wallet?clubID=club-1",
    clubName: "Aéroclub Test",
    clubAdress: { countrie: "France", zipCode: "34000", city: "Montpellier", adress: "Aérodrome" },
};

describe("Email solde faible", () => {
    it("affiche le solde, le contact du club et le lien vers le portefeuille", async () => {
        const html = await render(WalletLowBalance(baseProps));
        expect(html).toContain("25,00 €");
        expect(html).toContain("Marc LEFÈVRE");
        expect(html).toContain("0612345678");
        expect(html).toContain("https://app.example.fr/wallet?clubID=club-1");
        expect(html).toContain("Pensez à recharger");
    });

    it("solde épuisé : explique que les inscriptions sont bloquées", async () => {
        const html = await render(WalletLowBalance({ ...baseProps, balance: "−12,50 €", isEmpty: true }));
        expect(html).toContain("−12,50 €");
        expect(html).toContain("ne pouvez plus vous inscrire");
    });
});
