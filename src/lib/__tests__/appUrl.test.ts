import { describe, it, expect, afterEach, vi } from "vitest";
import { appUrl, normalizeBaseUrl } from "@/lib/appUrl";

/**
 * Regression: an email link without a domain ("/dashboard?clubID=LF666") is
 * rewritten by mail clients as "http://dashboard/?clubID=LF666". The base must
 * therefore always come out absolute, or empty (case reported in the logs).
 */
describe("normalizeBaseUrl", () => {
    it("garde une URL déjà absolue", () => {
        expect(normalizeBaseUrl("https://aeroconnect.fr")).toBe("https://aeroconnect.fr");
        expect(normalizeBaseUrl("http://localhost:3000")).toBe("http://localhost:3000");
    });

    it("ajoute le schéma quand il manque (sinon le lien reste relatif)", () => {
        expect(normalizeBaseUrl("aeroconnect.fr")).toBe("https://aeroconnect.fr");
    });

    it("retire le(s) slash(s) final(aux) pour ne pas doubler celui du chemin", () => {
        expect(normalizeBaseUrl("https://aeroconnect.fr/")).toBe("https://aeroconnect.fr");
        expect(normalizeBaseUrl("https://aeroconnect.fr///")).toBe("https://aeroconnect.fr");
    });

    it("tolère les espaces autour de la valeur (.env mal formaté)", () => {
        expect(normalizeBaseUrl(" http://localhost:3000 ")).toBe("http://localhost:3000");
    });

    it("renvoie une chaîne vide si rien n'est configuré", () => {
        expect(normalizeBaseUrl(undefined)).toBe("");
        expect(normalizeBaseUrl(null)).toBe("");
        expect(normalizeBaseUrl("   ")).toBe("");
    });

    it("produit un lien absolu une fois le chemin concaténé", () => {
        const link = `${normalizeBaseUrl("aeroconnect.fr/")}/dashboard?clubID=LF666`;
        expect(link).toBe("https://aeroconnect.fr/dashboard?clubID=LF666");
    });
});

/**
 * The original bug: NEXT_PUBLIC_APP_URL is not defined anywhere in the project
 * (only WEBSITE_LINK is, for the Supabase redirect). appUrl must therefore accept
 * both, otherwise the discovery-flight validation link goes out relative.
 */
describe("appUrl — résolution de la variable d'environnement", () => {
    const initial = {
        app: process.env.NEXT_PUBLIC_APP_URL,
        website: process.env.WEBSITE_LINK,
    };

    const setEnv = (app?: string, website?: string) => {
        if (app === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
        else process.env.NEXT_PUBLIC_APP_URL = app;
        if (website === undefined) delete process.env.WEBSITE_LINK;
        else process.env.WEBSITE_LINK = website;
    };

    afterEach(() => {
        setEnv(initial.app, initial.website);
        vi.restoreAllMocks();
    });

    it("utilise NEXT_PUBLIC_APP_URL en priorité", () => {
        setEnv("https://app.aeroconnect.fr", "http://localhost:3000");
        expect(appUrl()).toBe("https://app.aeroconnect.fr");
    });

    it("retombe sur WEBSITE_LINK quand NEXT_PUBLIC_APP_URL est absente", () => {
        setEnv(undefined, "http://localhost:3000");
        expect(appUrl()).toBe("http://localhost:3000");
    });

    it("normalise la valeur retenue (slash final, schéma manquant)", () => {
        setEnv("aeroconnect.fr/", undefined);
        expect(appUrl()).toBe("https://aeroconnect.fr");
        expect(`${appUrl()}/dashboard?clubID=LF666`).toBe(
            "https://aeroconnect.fr/dashboard?clubID=LF666"
        );
    });

    it("sans aucune variable : renvoie \"\" — le lien serait relatif, donc cassé", () => {
        // The helper warns in the server logs: intercept it so the test output stays
        // clean.
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        setEnv(undefined, undefined);
        expect(appUrl()).toBe("");
        expect(warn).toHaveBeenCalled();
        // Exactly what produced "http://dashboard/?clubID=…": the symptom is documented
        // so it does not go unnoticed again.
        expect(`${appUrl()}/dashboard?clubID=LF666`).toBe("/dashboard?clubID=LF666");
    });
});
