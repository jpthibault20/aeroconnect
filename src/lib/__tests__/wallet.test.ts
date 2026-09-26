import { describe, it, expect } from "vitest";
import { flightNature, instructionSubType, MachineUsage, userRole } from "@prisma/client";
import {
    balanceState,
    balanceTextClass,
    isOverdrawn,
    bookingBlockedMessage,
    canBookWithBalance,
    canManageWallet,
    canOperateMemberWallet,
    canViewClubWallets,
    canViewMemberWallet,
    centsToInput,
    computeFlightAdjustmentCents,
    computeFlightChargeCents,
    computeLowThresholdCents,
    crossedLowThreshold,
    formatCents,
    formatHourlyRate,
    formatSignedCents,
    isBillableFlight,
    isBookingGatedRole,
    parseEurosToCents,
    resolveFlightRate,
    resolvePayerID,
    transactionLabel,
} from "@/lib/wallet";
import { walletOperationSchema } from "@/schemas/wallet";

describe("computeFlightChargeCents", () => {
    it("prorata des minutes, arrondi au centime", () => {
        expect(computeFlightChargeCents(20, 15_000)).toBe(5_000); // 20 min à 150 €/h
        expect(computeFlightChargeCents(45, 12_000)).toBe(9_000); // 45 min à 120 €/h
        expect(computeFlightChargeCents(7, 10_000)).toBe(1_167); // 11,666… -> 11,67 €
        expect(computeFlightChargeCents(60, 13_550)).toBe(13_550);
    });

    it("durée ou tarif nul => 0", () => {
        expect(computeFlightChargeCents(0, 12_000)).toBe(0);
        expect(computeFlightChargeCents(30, 0)).toBe(0);
    });
});

describe("isBillableFlight", () => {
    it("toute instruction sauf baptême", () => {
        for (const sub of [instructionSubType.LOCAL, instructionSubType.NAVIGATION, instructionSubType.LACHE, instructionSubType.EXAM]) {
            expect(isBillableFlight({ flightNature: flightNature.INSTRUCTION, instructionSubType: sub })).toBe(true);
        }
        expect(isBillableFlight({ flightNature: flightNature.INSTRUCTION, instructionSubType: instructionSubType.BAPTEME })).toBe(false);
    });

    it("vol CDB (location) non débité", () => {
        expect(isBillableFlight({ flightNature: flightNature.CDB, instructionSubType: null })).toBe(false);
    });
});

describe("resolvePayerID", () => {
    it("vol saisi par l'instructeur : l'élève paie", () => {
        expect(resolvePayerID({ pilotID: "instr", instructorID: null, studentID: "eleve" })).toBe("eleve");
    });

    it("vol saisi par un pilote avec instructeur : le pilote paie", () => {
        expect(resolvePayerID({ pilotID: "pilote", instructorID: "instr", studentID: null })).toBe("pilote");
    });

    it("aucun payeur identifiable (passager externe)", () => {
        expect(resolvePayerID({ pilotID: "instr", instructorID: null, studentID: null })).toBeNull();
    });
});

describe("resolveFlightRate", () => {
    const base = { name: "Nynja", immatriculation: "F-JABC" };

    it("machine du club : tarif de la machine", () => {
        const r = resolveFlightRate({ ...base, ownerID: null, instructionHourlyRateCents: 12_000 }, { instructorHourlyRateCents: 3_500 });
        expect(r).toEqual({ ok: true, rateCents: 12_000, source: "PLANE" });
    });

    it("machine privée (de l'élève ou d'un autre) : tarif instructeur du club", () => {
        const r = resolveFlightRate({ ...base, ownerID: "eleve", instructionHourlyRateCents: 99_999 }, { instructorHourlyRateCents: 3_500 });
        expect(r).toEqual({ ok: true, rateCents: 3_500, source: "INSTRUCTOR" });
    });

    it("tarif manquant => erreur explicite", () => {
        const plane = resolveFlightRate({ ...base, ownerID: null, instructionHourlyRateCents: null }, { instructorHourlyRateCents: 3_500 });
        expect(plane.ok).toBe(false);
        if (!plane.ok) {
            expect(plane.error).toBe("MISSING_PLANE_RATE");
            expect(plane.message).toContain("F-JABC");
        }
        const instr = resolveFlightRate({ ...base, ownerID: "x", instructionHourlyRateCents: null }, { instructorHourlyRateCents: null });
        expect(instr.ok).toBe(false);
        if (!instr.ok) expect(instr.error).toBe("MISSING_INSTRUCTOR_RATE");
    });

    it("tarif à 0 € accepté (vol gratuit)", () => {
        const r = resolveFlightRate({ ...base, ownerID: null, instructionHourlyRateCents: 0 }, { instructorHourlyRateCents: null });
        expect(r.ok).toBe(true);
    });
});

describe("seuil et état du solde", () => {
    const planes = [
        { ownerID: null, usageTypes: [MachineUsage.INSTRUCTION], instructionHourlyRateCents: 15_000 },
        { ownerID: null, usageTypes: [MachineUsage.INSTRUCTION, MachineUsage.LOCATION], instructionHourlyRateCents: 12_000 },
        { ownerID: null, usageTypes: [MachineUsage.LOCATION], instructionHourlyRateCents: 5_000 }, // pas d'école
        { ownerID: "u1", usageTypes: [], instructionHourlyRateCents: 1_000 }, // privée
        { ownerID: null, usageTypes: [MachineUsage.INSTRUCTION], instructionHourlyRateCents: null },
    ];

    it("seuil = heure sur la machine d'école la moins chère", () => {
        expect(computeLowThresholdCents(planes)).toBe(12_000);
        expect(computeLowThresholdCents([])).toBeNull();
    });

    it("états", () => {
        expect(balanceState(0, 12_000)).toBe("empty");
        expect(balanceState(-1, 12_000)).toBe("empty");
        expect(balanceState(5_000, 12_000)).toBe("low");
        expect(balanceState(12_000, 12_000)).toBe("ok");
        expect(balanceState(1, null)).toBe("ok");
    });

    it("passage sous le seuil détecté une seule fois", () => {
        expect(crossedLowThreshold(20_000, 5_000, 12_000)).toBe(true);
        expect(crossedLowThreshold(20_000, -500, 12_000)).toBe(true);
        expect(crossedLowThreshold(5_000, 1_000, 12_000)).toBe(false); // déjà faible
        expect(crossedLowThreshold(5_000, 20_000, 12_000)).toBe(false); // remonte
        expect(crossedLowThreshold(500, 0, null)).toBe(true); // sans seuil : épuisé
    });

    it("inscription : solde strictement positif", () => {
        expect(canBookWithBalance(1)).toBe(true);
        expect(canBookWithBalance(0)).toBe(false);
        expect(canBookWithBalance(-100)).toBe(false);
    });
});

describe("formatage et saisie", () => {
    it("formatCents", () => {
        expect(formatCents(4_500)).toBe("45,00 €");
        expect(formatCents(-1_250)).toBe("−12,50 €");
        expect(formatCents(120_000)).toBe("1 200,00 €");
        expect(formatSignedCents(15_000)).toBe("+150,00 €");
        expect(formatSignedCents(-9_000)).toBe("−90,00 €");
        expect(formatSignedCents(0)).toBe("0,00 €");
    });

    it("formatHourlyRate", () => {
        expect(formatHourlyRate(12_000)).toBe("120 €/h");
        expect(formatHourlyRate(12_050)).toBe("120,50 €/h");
    });

    it("parseEurosToCents accepte la virgule, refuse > 2 décimales", () => {
        expect(parseEurosToCents("150")).toBe(15_000);
        expect(parseEurosToCents("150,5")).toBe(15_050);
        expect(parseEurosToCents(" 1 200,00 ")).toBe(120_000);
        expect(parseEurosToCents("0.07")).toBe(7);
        expect(parseEurosToCents("12,345")).toBeNull();
        expect(parseEurosToCents("-5")).toBeNull();
        expect(parseEurosToCents("abc")).toBeNull();
        expect(parseEurosToCents("")).toBeNull();
    });

    it("centsToInput", () => {
        expect(centsToInput(12_000)).toBe("120,00");
        expect(centsToInput(null)).toBe("");
    });
});

describe("droits d'accès (cloisonnement par club)", () => {
    const student = { id: "s1", role: userRole.STUDENT, clubID: "A" };
    const instructor = { id: "i1", role: userRole.INSTRUCTOR, clubID: "A" };
    const manager = { id: "m1", role: userRole.MANAGER, clubID: "A" };
    const otherClubOwner = { id: "o2", role: userRole.OWNER, clubID: "B" };

    it("un élève ne voit que son propre portefeuille", () => {
        expect(canViewMemberWallet(student, { id: "s1", clubID: "A" })).toBe(true);
        expect(canViewMemberWallet(student, { id: "s2", clubID: "A" })).toBe(false);
    });

    it("instructeur : lecture seule sur son club", () => {
        expect(canViewMemberWallet(instructor, { id: "s1", clubID: "A" })).toBe(true);
        expect(canOperateMemberWallet(instructor, { clubID: "A" })).toBe(false);
        expect(canViewClubWallets(userRole.INSTRUCTOR)).toBe(true);
        expect(canManageWallet(userRole.INSTRUCTOR)).toBe(false);
    });

    it("gestion : lecture et opérations sur son club uniquement", () => {
        expect(canOperateMemberWallet(manager, { clubID: "A" })).toBe(true);
        expect(canOperateMemberWallet(manager, { clubID: "B" })).toBe(false);
        expect(canViewMemberWallet(manager, { id: "x", clubID: "B" })).toBe(false);
    });

    it("jamais d'accès inter-clubs, même pour un président", () => {
        expect(canViewMemberWallet(otherClubOwner, { id: "s1", clubID: "A" })).toBe(false);
        expect(canOperateMemberWallet(otherClubOwner, { clubID: "A" })).toBe(false);
    });

    it("sans club => aucun accès", () => {
        expect(canViewMemberWallet({ ...manager, clubID: null }, { id: "m1", clubID: null })).toBe(false);
    });

    it("seuls STUDENT et PILOT sont bloqués à l'inscription", () => {
        expect(isBookingGatedRole(userRole.STUDENT)).toBe(true);
        expect(isBookingGatedRole(userRole.PILOT)).toBe(true);
        expect(isBookingGatedRole(userRole.INSTRUCTOR)).toBe(false);
        expect(isBookingGatedRole(userRole.OWNER)).toBe(false);
    });
});

describe("libellés et messages", () => {
    it("ajustement manuel vs correction automatique", () => {
        expect(transactionLabel("ADJUSTMENT", "m1")).toBe("Ajustement");
        expect(transactionLabel("ADJUSTMENT", null)).toBe("Correction de vol");
        expect(transactionLabel("CREDIT", "m1")).toBe("Paiement reçu");
        expect(transactionLabel("DEBIT", null)).toBe("Vol d'instruction");
    });

    it("message de blocage avec contact du club", () => {
        const msg = bookingBlockedMessage(-1_250, { firstNameContact: "Marc", lastNameContact: "Lefèvre", mailContact: "c@club.fr", phoneContact: "0612345678" });
        expect(msg).toContain("−12,50 €");
        expect(msg).toContain("Marc LEFÈVRE");
        expect(msg).toContain("0612345678");
    });

    it("message de blocage sans contact", () => {
        const msg = bookingBlockedMessage(0, { firstNameContact: null, lastNameContact: null, mailContact: null, phoneContact: null });
        expect(msg).toContain("président");
    });
});

describe("walletOperationSchema", () => {
    it("crédit : moyen de paiement obligatoire", () => {
        expect(walletOperationSchema.safeParse({ memberID: "s1", kind: "CREDIT", amountCents: 15_000 }).success).toBe(false);
        expect(walletOperationSchema.safeParse({ memberID: "s1", kind: "CREDIT", amountCents: 15_000, paymentMethod: "CHECK" }).success).toBe(true);
    });

    it("retrait : motif et montant obligatoires", () => {
        expect(walletOperationSchema.safeParse({ memberID: "s1", kind: "WITHDRAW", amountCents: 3_000 }).success).toBe(false);
        expect(walletOperationSchema.safeParse({ memberID: "s1", kind: "WITHDRAW", amountCents: 0, comment: "erreur" }).success).toBe(false);
        expect(walletOperationSchema.safeParse({ memberID: "s1", kind: "WITHDRAW", amountCents: 3_000, comment: "erreur de saisie" }).success).toBe(true);
    });

    it("montant négatif ou décimal refusé", () => {
        expect(walletOperationSchema.safeParse({ memberID: "s1", kind: "CREDIT", amountCents: -100, paymentMethod: "CASH" }).success).toBe(false);
        expect(walletOperationSchema.safeParse({ memberID: "s1", kind: "CREDIT", amountCents: 10.5, paymentMethod: "CASH" }).success).toBe(false);
    });
});

describe("computeFlightAdjustmentCents (vol signé corrigé)", () => {
    it("vol rallongé de 0h45 à 0h55 à 120 €/h : 20 € de plus", () => {
        expect(computeFlightAdjustmentCents({ billable: true, durationMin: 55, frozenRateCents: 12_000, movementsSumCents: -9_000 })).toBe(-2_000);
    });

    it("vol raccourci : remboursement de la différence", () => {
        expect(computeFlightAdjustmentCents({ billable: true, durationMin: 30, frozenRateCents: 12_000, movementsSumCents: -9_000 })).toBe(3_000);
    });

    it("tient compte des corrections déjà passées", () => {
        // débit -90 puis correction -20 : déjà prélevé 110 € pour 55 min => rien à faire
        expect(computeFlightAdjustmentCents({ billable: true, durationMin: 55, frozenRateCents: 12_000, movementsSumCents: -11_000 })).toBe(0);
    });

    it("vol requalifié en non facturable (ex. baptême) : remboursement total", () => {
        expect(computeFlightAdjustmentCents({ billable: false, durationMin: 45, frozenRateCents: 12_000, movementsSumCents: -9_000 })).toBe(9_000);
    });

    it("le tarif figé fait foi, même si le tarif de la machine a changé depuis", () => {
        // durée inchangée : aucune régularisation, quel que soit le tarif actuel
        expect(computeFlightAdjustmentCents({ billable: true, durationMin: 45, frozenRateCents: 12_000, movementsSumCents: -9_000 })).toBe(0);
    });
});

describe("isOverdrawn / balanceTextClass", () => {
    it("à découvert = solde strictement négatif (0 € n'est pas un découvert)", () => {
        expect(isOverdrawn(-1)).toBe(true);
        expect(isOverdrawn(0)).toBe(false);
        expect(isOverdrawn(500)).toBe(false);
    });

    it("couleurs : rouge si négatif, ambre à 0, neutre sinon", () => {
        expect(balanceTextClass(-1_250)).toBe("text-red-600");
        expect(balanceTextClass(0)).toBe("text-amber-600");
        expect(balanceTextClass(4_500)).toBe("text-slate-400");
    });
});
