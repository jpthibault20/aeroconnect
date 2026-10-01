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
    const block = (role: userRole, balanceCents: number, bookingMinCents = 0, walletEnabled = true) =>
        bookingWalletBlock({ walletEnabled, role, balanceCents, bookingMinCents, contact });

    it("bloque un élève ou un pilote sous le seuil", () => {
        for (const role of [userRole.STUDENT, userRole.PILOT]) {
            expect(block(role, -1)).toContain("Marc LEFÈVRE");
            expect(block(role, -1_250)).not.toBeNull();
            expect(block(role, 4_999, 5_000)).toContain("d'au moins 50,00 €");
        }
    });

    it("AER-73 : autorise un solde à 0 € avec le seuil par défaut", () => {
        expect(block(userRole.STUDENT, 0)).toBeNull();
        expect(block(userRole.PILOT, 0)).toBeNull();
    });

    it("autorise un solde au seuil (borne incluse), y compris un découvert toléré", () => {
        expect(block(userRole.STUDENT, 5_000, 5_000)).toBeNull();
        expect(block(userRole.STUDENT, -15_000, -20_000)).toBeNull();
        expect(block(userRole.STUDENT, -20_001, -20_000)).not.toBeNull();
    });

    it("ne bloque jamais les autres rôles", () => {
        for (const role of [userRole.INSTRUCTOR, userRole.OWNER, userRole.ADMIN, userRole.MANAGER]) {
            expect(block(role, -5_000)).toBeNull();
        }
    });

    it("ne bloque rien si le portefeuille est désactivé", () => {
        expect(block(userRole.STUDENT, -5_000, 0, false)).toBeNull();
    });
});

describe("managerBookingWarning — inscription par la gestion", () => {
    const member = { clubID: "club-1", role: userRole.STUDENT, firstName: "Léa", lastName: "Dupont" };

    const warn = (overrides: Partial<Parameters<typeof managerBookingWarning>[0]>) =>
        managerBookingWarning({ walletEnabled: true, clubID: "club-1", member, balanceCents: -1_250, bookingMinCents: 0, ...overrides });

    it("avertit (sans bloquer) pour un élève sous le seuil", () => {
        const warning = warn({});
        expect(warning).toContain("Léa DUPONT");
        expect(warning).toContain("−12,50 €");
        expect(warn({ balanceCents: 4_000, bookingMinCents: 5_000 })).not.toBeNull();
    });

    it("pas d'avertissement au seuil ou au-dessus", () => {
        expect(warn({ balanceCents: 0 })).toBeNull();
        expect(warn({ balanceCents: 500 })).toBeNull();
        expect(warn({ balanceCents: -1_250, bookingMinCents: -20_000 })).toBeNull();
    });

    it("pas d'avertissement pour un invité externe, un autre club, un rôle non concerné ou portefeuille désactivé", () => {
        expect(warn({ member: null })).toBeNull();
        expect(warn({ member: { ...member, clubID: "club-2" } })).toBeNull();
        expect(warn({ member: { ...member, role: userRole.INSTRUCTOR } })).toBeNull();
        expect(warn({ walletEnabled: false })).toBeNull();
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
