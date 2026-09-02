import { describe, it, expect } from "vitest";
import { render } from "@react-email/render";
import BaptemeClientConfirmed from "@/emails/BaptemeClientConfirmed";

/**
 * L'email de confirmation doit porter les coordonnées du pilote : c'est le seul
 * canal dont dispose un client extérieur (non membre, sans compte) pour joindre
 * quelqu'un en cas d'imprévu le jour du vol.
 */
const baseProps = {
    firstName: "Paul",
    startDate: "12/08/2026 14:00:00",
    endDate: "12/08/2026 15:00:00",
    planeName: "F-JABC",
    optionLabel: null,
    clubName: "Aéroclub Test",
    clubAdress: { countrie: "France", zipCode: "34000", city: "Montpellier", adress: "Aérodrome" },
    airfield: "LFMT",
    phoneContact: "0400000000",
    mailContact: "contact@club.fr",
};

const pilot = {
    firstName: "Luc",
    lastName: "Dupont",
    email: "luc@club.fr",
    phone: "0601020304",
};

describe("Email de confirmation baptême — contact du pilote", () => {
    it("affiche nom, téléphone et email du pilote", async () => {
        const html = await render(BaptemeClientConfirmed({ ...baseProps, pilot }));
        expect(html).toContain("Votre pilote");
        expect(html).toContain("Luc");
        expect(html).toContain("DUPONT");
        expect(html).toContain("0601020304");
        expect(html).toContain("luc@club.fr");
    });

    it("omet les lignes non renseignées sans casser le bloc", async () => {
        const html = await render(
            BaptemeClientConfirmed({ ...baseProps, pilot: { ...pilot, phone: null } })
        );
        expect(html).toContain("Votre pilote");
        expect(html).toContain("luc@club.fr");
        expect(html).not.toContain("0601020304");
    });

    it("masque toute la section si le pilote est introuvable", async () => {
        const html = await render(BaptemeClientConfirmed({ ...baseProps, pilot: null }));
        expect(html).not.toContain("Votre pilote");
        // Le reste de l'email reste intact.
        expect(html).toContain("F-JABC");
        expect(html).toContain("contact@club.fr");
    });

    it("affiche la formule choisie quand la machine en avait une configurée", async () => {
        const html = await render(
            BaptemeClientConfirmed({ ...baseProps, optionLabel: "30 min – 90,00 €", pilot: null })
        );
        expect(html).toContain("30 min – 90,00 €");
    });
});
