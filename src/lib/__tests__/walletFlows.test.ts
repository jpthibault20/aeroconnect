import { describe, it, expect } from "vitest";
import { flightNature, instructionSubType, userRole } from "@prisma/client";
import {
    bookingWalletBlock,
    FlightChargeInput,
    managerBookingWarning,
    operationToMovement,
    planFlightCharge,
    resolveWalletTarget,
} from "@/lib/wallet";

/**
 * Student wallet flows (AER-66): what the debit on signing, the booking block,
 * the management warning, wallet viewing and manual operations decide. The server
 * actions only re-read the DB then apply these decisions.
 */

// 45 min instruction flight (Hobbs 812.25 -> 813.00) entered by the instructor.
const baseLog: FlightChargeInput["log"] = {
    clubID: "club-1",
    planeID: "plane-club",
    pilotID: "instr",
    instructorID: null,
    studentID: "eleve",
    flightNature: flightNature.INSTRUCTION,
    instructionSubType: instructionSubType.LOCAL,
    hobbsStart: 812.25,
    hobbsEnd: 813,
};

const clubPlane = { clubID: "club-1", ownerID: null, instructionHourlyRateCents: 12_000, name: "Nynja", immatriculation: "F-JABC" };
const privatePlane = { clubID: "club-1", ownerID: "eleve", instructionHourlyRateCents: null, name: "Savannah", immatriculation: "F-JXYZ" };

const input = (overrides: Partial<FlightChargeInput> = {}): FlightChargeInput => ({
    walletEnabled: true,
    log: baseLog,
    payer: { clubID: "club-1" },
    plane: clubPlane,
    club: { instructorHourlyRateCents: 3_500 },
    ...overrides,
});

describe("planFlightCharge — débit à la signature", () => {
    it("vol d'instruction sur machine du club : débit de l'élève au tarif machine", () => {
        expect(planFlightCharge(input())).toEqual({
            action: "charge",
            payerID: "eleve",
            amountCents: 9_000,
            durationMin: 45,
            rateCents: 12_000,
            rateSource: "PLANE",
        });
    });

    it("machine privée : tarif instructeur du club", () => {
        const plan = planFlightCharge(input({ plane: privatePlane }));
        expect(plan).toMatchObject({ action: "charge", amountCents: 2_625, rateSource: "INSTRUCTOR" });
    });

    it("vol saisi par un pilote avec son instructeur : le pilote est débité", () => {
        const log = { ...baseLog, pilotID: "pilote", instructorID: "instr", studentID: null };
        expect(planFlightCharge(input({ log }))).toMatchObject({ action: "charge", payerID: "pilote" });
    });

    it("vol lâché (instructeur au sol) : l'élève est quand même débité", () => {
        const log = { ...baseLog, instructionSubType: instructionSubType.LACHE };
        expect(planFlightCharge(input({ log }))).toMatchObject({ action: "charge", payerID: "eleve" });
    });

    describe("rien n'est débité", () => {
        it("portefeuille désactivé pour le club", () => {
            expect(planFlightCharge(input({ walletEnabled: false }))).toEqual({ action: "skip", reason: "WALLET_DISABLED" });
        });

        it("baptême", () => {
            const log = { ...baseLog, instructionSubType: instructionSubType.BAPTEME };
            expect(planFlightCharge(input({ log }))).toEqual({ action: "skip", reason: "NOT_BILLABLE" });
        });

        it("vol commandant de bord (location, hors périmètre)", () => {
            const log = { ...baseLog, flightNature: flightNature.CDB, instructionSubType: null, studentID: null };
            expect(planFlightCharge(input({ log }))).toEqual({ action: "skip", reason: "NOT_BILLABLE" });
        });

        it("aucun payeur identifiable", () => {
            const log = { ...baseLog, studentID: null, instructorID: null };
            expect(planFlightCharge(input({ log }))).toEqual({ action: "skip", reason: "NO_PAYER" });
        });

        it("le portefeuille désactivé passe avant tout refus (pas de blocage de signature)", () => {
            expect(planFlightCharge(input({ walletEnabled: false, plane: null, payer: null })).action).toBe("skip");
        });
    });

    describe("la signature est refusée", () => {
        it("tarif écolage manquant sur la machine du club", () => {
            const plan = planFlightCharge(input({ plane: { ...clubPlane, instructionHourlyRateCents: null } }));
            expect(plan.action).toBe("reject");
            if (isReject(plan)) expect(plan.message).toContain("F-JABC");
        });

        it("tarif instructeur manquant pour une machine privée", () => {
            const plan = planFlightCharge(input({ plane: privatePlane, club: { instructorHourlyRateCents: null } }));
            expect(plan.action).toBe("reject");
            if (isReject(plan)) expect(plan.message).toContain("tarif horaire instructeur");
        });

        it("payeur introuvable ou d'un autre club", () => {
            expect(planFlightCharge(input({ payer: null })).action).toBe("reject");
            expect(planFlightCharge(input({ payer: { clubID: "club-2" } })).action).toBe("reject");
        });

        it("machine d'un autre club", () => {
            expect(planFlightCharge(input({ plane: { ...clubPlane, clubID: "club-2" } })).action).toBe("reject");
        });

        it("vol sans machine", () => {
            const log = { ...baseLog, planeID: null };
            expect(planFlightCharge(input({ log, plane: null })).action).toBe("reject");
        });
    });

    it("heures moteur incomplètes : débit à 0 (aucune durée)", () => {
        const log = { ...baseLog, hobbsEnd: null };
        expect(planFlightCharge(input({ log }))).toMatchObject({ action: "charge", amountCents: 0, durationMin: 0 });
    });
});

// Small type guard for assertions on the refusal message.
function isReject(plan: ReturnType<typeof planFlightCharge>): plan is Extract<typeof plan, { action: "reject" }> {
    return plan.action === "reject";
}

const contact = { firstNameContact: "Marc", lastNameContact: "Lefèvre", mailContact: "c@club.fr", phoneContact: "0612345678" };

describe("bookingWalletBlock — inscription par l'élève / le pilote", () => {
    it("bloque un élève ou un pilote à solde nul ou négatif", () => {
        for (const role of [userRole.STUDENT, userRole.PILOT]) {
            expect(bookingWalletBlock({ walletEnabled: true, role, balanceCents: 0, contact })).toContain("Marc LEFÈVRE");
            expect(bookingWalletBlock({ walletEnabled: true, role, balanceCents: -1_250, contact })).not.toBeNull();
        }
    });

    it("autorise un solde strictement positif, même faible", () => {
        expect(bookingWalletBlock({ walletEnabled: true, role: userRole.STUDENT, balanceCents: 1, contact })).toBeNull();
    });

    it("ne bloque jamais les autres rôles", () => {
        for (const role of [userRole.INSTRUCTOR, userRole.OWNER, userRole.ADMIN, userRole.MANAGER]) {
            expect(bookingWalletBlock({ walletEnabled: true, role, balanceCents: -5_000, contact })).toBeNull();
        }
    });

    it("ne bloque rien si le portefeuille est désactivé", () => {
        expect(bookingWalletBlock({ walletEnabled: false, role: userRole.STUDENT, balanceCents: -5_000, contact })).toBeNull();
    });
});

describe("managerBookingWarning — inscription par la gestion", () => {
    const member = { clubID: "club-1", role: userRole.STUDENT, firstName: "Léa", lastName: "Dupont" };

    it("avertit (sans bloquer) pour un élève à solde ≤ 0", () => {
        const warning = managerBookingWarning({ walletEnabled: true, clubID: "club-1", member, balanceCents: -1_250 });
        expect(warning).toContain("Léa DUPONT");
        expect(warning).toContain("−12,50 €");
        expect(managerBookingWarning({ walletEnabled: true, clubID: "club-1", member, balanceCents: 0 })).not.toBeNull();
    });

    it("pas d'avertissement si le solde est positif", () => {
        expect(managerBookingWarning({ walletEnabled: true, clubID: "club-1", member, balanceCents: 500 })).toBeNull();
    });

    it("pas d'avertissement pour un invité externe, un autre club, un rôle non concerné ou portefeuille désactivé", () => {
        expect(managerBookingWarning({ walletEnabled: true, clubID: "club-1", member: null, balanceCents: 0 })).toBeNull();
        expect(managerBookingWarning({ walletEnabled: true, clubID: "club-1", member: { ...member, clubID: "club-2" }, balanceCents: 0 })).toBeNull();
        expect(managerBookingWarning({ walletEnabled: true, clubID: "club-1", member: { ...member, role: userRole.INSTRUCTOR }, balanceCents: 0 })).toBeNull();
        expect(managerBookingWarning({ walletEnabled: false, clubID: "club-1", member, balanceCents: 0 })).toBeNull();
    });
});

describe("resolveWalletTarget — portefeuille consulté", () => {
    it("un élève ou un pilote reçoit toujours son propre portefeuille", () => {
        expect(resolveWalletTarget({ id: "s1", role: userRole.STUDENT }, "s2")).toBe("s1");
        expect(resolveWalletTarget({ id: "p1", role: userRole.PILOT }, "s2")).toBe("p1");
        expect(resolveWalletTarget({ id: "s1", role: userRole.STUDENT }, null)).toBe("s1");
    });

    it("instructeur et gestion consultent le membre demandé", () => {
        expect(resolveWalletTarget({ id: "i1", role: userRole.INSTRUCTOR }, "s2")).toBe("s2");
        expect(resolveWalletTarget({ id: "m1", role: userRole.MANAGER }, "s2")).toBe("s2");
    });

    it("sans membre demandé : son propre portefeuille", () => {
        expect(resolveWalletTarget({ id: "m1", role: userRole.OWNER }, null)).toBe("m1");
    });
});

describe("operationToMovement — opérations manuelles", () => {
    it("paiement reçu : CREDIT positif", () => {
        expect(operationToMovement("CREDIT", 15_000)).toEqual({ type: "CREDIT", amountCents: 15_000 });
    });

    it("retrait / correction : ADJUSTMENT négatif", () => {
        expect(operationToMovement("WITHDRAW", 3_000)).toEqual({ type: "ADJUSTMENT", amountCents: -3_000 });
    });
});
