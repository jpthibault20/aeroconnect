import { describe, it, expect } from "vitest";
import { render } from "@react-email/render";
import WalletLowBalance from "@/emails/WalletLowBalance";

/**
 * "Low / insufficient balance" email (AER-66): must explain the situation and give a
 * way to top up (club contact + absolute link).
 */
const baseProps = {
    firstName: "Léa",
    balance: "25,00 €",
    isBlocked: false,
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

    it("solde insuffisant : explique que les inscriptions sont bloquées", async () => {
        const html = await render(WalletLowBalance({ ...baseProps, balance: "−12,50 €", isBlocked: true }));
        expect(html).toContain("−12,50 €");
        expect(html).toContain("ne pouvez plus vous inscrire");
    });
});
