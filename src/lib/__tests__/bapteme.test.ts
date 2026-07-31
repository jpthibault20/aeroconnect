import { describe, it, expect } from "vitest";
import { NatureOfTheft, userRole } from "@prisma/client";
import {
    BaptemePlaneLike,
    BaptemeRequestLike,
    BaptemeSlotLike,
    canManagePublicLink,
    canValidateBapteme,
    computeHoldExpiry,
    filterBaptemePlanes,
    formatBaptemeSlotLabel,
    formatPilotName,
    hasActiveHold,
    HOLD_TTL_MINUTES,
    isBaptemeSlot,
    isBaptemeSlotAvailable,
    isHoldExpired,
    natureOfTheftForBapteme,
    nextBaptemeStatus,
} from "@/lib/bapteme";
import { baptemeRequestSchema } from "@/schemas/baptemeSchema";

const now = new Date("2026-07-22T12:00:00Z");
const future = new Date("2026-07-23T10:00:00Z");
const past = new Date("2026-07-21T10:00:00Z");

// ─── Fabriques ───

const makeSlot = (over: Partial<BaptemeSlotLike> = {}): BaptemeSlotLike => ({
    studentID: null,
    natureOfTheft: [NatureOfTheft.DISCOVERY],
    sessionDateStart: future,
    planeID: ["p-club"],
    classes: [],
    ...over,
});

const makePlane = (over: Partial<BaptemePlaneLike> = {}): BaptemePlaneLike => ({
    id: "p-club",
    ownerID: null,
    operational: true,
    classes: 3,
    ...over,
});

const clubPlane = makePlane();

// ─── isBaptemeSlotAvailable ───

describe("isBaptemeSlotAvailable", () => {
    it("créneau libre marqué baptême avec machine club → disponible", () => {
        expect(isBaptemeSlotAvailable(makeSlot(), [clubPlane], [], now)).toBe(true);
    });

    it("créneau avec un élève déjà inscrit → non", () => {
        expect(
            isBaptemeSlotAvailable(makeSlot({ studentID: "invited" }), [clubPlane], [], now)
        ).toBe(false);
    });

    it("créneau non marqué baptême (pas de DISCOVERY) → non", () => {
        expect(
            isBaptemeSlotAvailable(makeSlot({ natureOfTheft: [NatureOfTheft.TRAINING] }), [clubPlane], [], now)
        ).toBe(false);
    });

    it("créneau avec un hold PENDING actif → non", () => {
        const holds: BaptemeRequestLike[] = [{ status: "PENDING", expiresAt: new Date("2026-07-22T12:10:00Z") }];
        expect(isBaptemeSlotAvailable(makeSlot(), [clubPlane], holds, now)).toBe(false);
    });

    it("créneau dont le hold PENDING est expiré → de nouveau disponible", () => {
        const holds: BaptemeRequestLike[] = [{ status: "PENDING", expiresAt: past }];
        expect(isBaptemeSlotAvailable(makeSlot(), [clubPlane], holds, now)).toBe(true);
    });

    it("créneau passé → non", () => {
        expect(isBaptemeSlotAvailable(makeSlot({ sessionDateStart: past }), [clubPlane], [], now)).toBe(false);
    });

    it("créneau sans aucune machine club (que des privées) → non", () => {
        const privatePlane = makePlane({ ownerID: "u-owner" });
        expect(isBaptemeSlotAvailable(makeSlot(), [privatePlane], [], now)).toBe(false);
    });
});

// ─── filterBaptemePlanes ───

describe("filterBaptemePlanes", () => {
    const slot = { planeID: ["p1", "p2", "p3"], classes: [3] };

    it("exclut les machines privées (ownerID != null)", () => {
        const planes = [makePlane({ id: "p1", ownerID: "u-owner" })];
        expect(filterBaptemePlanes(planes, slot)).toHaveLength(0);
    });

    it("exclut les machines non opérationnelles", () => {
        const planes = [makePlane({ id: "p1", operational: false })];
        expect(filterBaptemePlanes(planes, slot)).toHaveLength(0);
    });

    it("exclut les machines de classe incompatible avec le créneau", () => {
        const planes = [makePlane({ id: "p1", classes: 1 })]; // créneau ne propose que la classe 3
        expect(filterBaptemePlanes(planes, slot)).toHaveLength(0);
    });

    it("exclut les machines hors planeID du créneau", () => {
        const planes = [makePlane({ id: "pX", classes: 3 })];
        expect(filterBaptemePlanes(planes, slot)).toHaveLength(0);
    });

    it("conserve les machines club opérationnelles compatibles offertes sur le créneau", () => {
        const planes = [
            makePlane({ id: "p1", classes: 3 }),
            makePlane({ id: "p2", ownerID: "u-owner", classes: 3 }),
            makePlane({ id: "p3", classes: 3, operational: false }),
        ];
        const kept = filterBaptemePlanes(planes, slot);
        expect(kept.map((p) => p.id)).toEqual(["p1"]);
    });

    it("sans restriction de classe sur le créneau (classes vide) → n'exclut pas par classe", () => {
        const planes = [makePlane({ id: "p1", classes: 1 })];
        expect(filterBaptemePlanes(planes, { planeID: ["p1"], classes: [] })).toHaveLength(1);
    });
});

// ─── isHoldExpired / hasActiveHold ───

describe("isHoldExpired", () => {
    it("PENDING échu → expiré", () => {
        expect(isHoldExpired({ status: "PENDING", expiresAt: past }, now)).toBe(true);
    });

    it("PENDING futur → actif (non expiré)", () => {
        expect(isHoldExpired({ status: "PENDING", expiresAt: future }, now)).toBe(false);
    });

    it("CONFIRMED / REJECTED / EXPIRED sont ignorés (jamais 'expirés')", () => {
        expect(isHoldExpired({ status: "CONFIRMED", expiresAt: past }, now)).toBe(false);
        expect(isHoldExpired({ status: "REJECTED", expiresAt: past }, now)).toBe(false);
        expect(isHoldExpired({ status: "EXPIRED", expiresAt: past }, now)).toBe(false);
    });
});

describe("hasActiveHold", () => {
    it("vrai s'il existe au moins un PENDING non expiré", () => {
        expect(
            hasActiveHold(
                [
                    { status: "PENDING", expiresAt: past },
                    { status: "PENDING", expiresAt: future },
                ],
                now
            )
        ).toBe(true);
    });

    it("faux si tous les PENDING sont expirés ou déjà traités", () => {
        expect(
            hasActiveHold(
                [
                    { status: "PENDING", expiresAt: past },
                    { status: "CONFIRMED", expiresAt: future },
                ],
                now
            )
        ).toBe(false);
    });
});

// ─── canValidateBapteme ───

describe("canValidateBapteme", () => {
    const slot = { pilotID: "pilot-1" };

    it("pilote assigné → oui", () => {
        expect(canValidateBapteme({ id: "pilot-1", role: userRole.INSTRUCTOR }, slot)).toBe(true);
    });

    it("gestion (OWNER / ADMIN / MANAGER) → oui même si non assignée", () => {
        expect(canValidateBapteme({ id: "x", role: userRole.OWNER }, slot)).toBe(true);
        expect(canValidateBapteme({ id: "x", role: userRole.ADMIN }, slot)).toBe(true);
        expect(canValidateBapteme({ id: "x", role: userRole.MANAGER }, slot)).toBe(true);
    });

    it("instructeur non assigné, pilote non assigné, élève → non", () => {
        expect(canValidateBapteme({ id: "other", role: userRole.INSTRUCTOR }, slot)).toBe(false);
        expect(canValidateBapteme({ id: "other", role: userRole.PILOT }, slot)).toBe(false);
        expect(canValidateBapteme({ id: "other", role: userRole.STUDENT }, slot)).toBe(false);
    });
});

// ─── canManagePublicLink ───

describe("canManagePublicLink", () => {
    it("ADMIN et OWNER → oui", () => {
        expect(canManagePublicLink(userRole.ADMIN)).toBe(true);
        expect(canManagePublicLink(userRole.OWNER)).toBe(true);
    });

    it("MANAGER, INSTRUCTOR, PILOT, STUDENT, USER → non", () => {
        expect(canManagePublicLink(userRole.MANAGER)).toBe(false);
        expect(canManagePublicLink(userRole.INSTRUCTOR)).toBe(false);
        expect(canManagePublicLink(userRole.PILOT)).toBe(false);
        expect(canManagePublicLink(userRole.STUDENT)).toBe(false);
        expect(canManagePublicLink(userRole.USER)).toBe(false);
    });
});

// ─── nextBaptemeStatus ───

describe("nextBaptemeStatus", () => {
    it("transitions valides depuis PENDING", () => {
        expect(nextBaptemeStatus("PENDING", "validate")).toBe("CONFIRMED");
        expect(nextBaptemeStatus("PENDING", "reject")).toBe("REJECTED");
        expect(nextBaptemeStatus("PENDING", "expire")).toBe("EXPIRED");
    });

    it("garde d'idempotence : une demande déjà traitée ne peut pas re-transiter", () => {
        expect(nextBaptemeStatus("CONFIRMED", "validate")).toEqual({ error: expect.any(String) });
        expect(nextBaptemeStatus("REJECTED", "validate")).toEqual({ error: expect.any(String) });
        expect(nextBaptemeStatus("EXPIRED", "reject")).toEqual({ error: expect.any(String) });
    });
});

// ─── Schéma zod de la demande publique ───

describe("baptemeRequestSchema", () => {
    const valid = {
        firstName: "Jean",
        lastName: "Dupont",
        email: "jean.dupont@example.com",
        phone: "0612345678",
        comment: "Cadeau d'anniversaire",
        sessionID: "sess-1",
        planeID: "p-club",
    };

    it("accepte une demande valide", () => {
        expect(baptemeRequestSchema.safeParse(valid).success).toBe(true);
    });

    it("le commentaire est optionnel", () => {
        const { comment, ...withoutComment } = valid;
        void comment;
        expect(baptemeRequestSchema.safeParse(withoutComment).success).toBe(true);
        expect(baptemeRequestSchema.safeParse({ ...valid, comment: "" }).success).toBe(true);
    });

    it("rejette un email invalide", () => {
        expect(baptemeRequestSchema.safeParse({ ...valid, email: "pas-un-email" }).success).toBe(false);
    });

    it("rejette un contact incomplet (nom/prénom/téléphone requis)", () => {
        expect(baptemeRequestSchema.safeParse({ ...valid, firstName: "" }).success).toBe(false);
        expect(baptemeRequestSchema.safeParse({ ...valid, lastName: "" }).success).toBe(false);
        expect(baptemeRequestSchema.safeParse({ ...valid, phone: "" }).success).toBe(false);
    });

    it("exige le choix d'un créneau et d'un appareil", () => {
        expect(baptemeRequestSchema.safeParse({ ...valid, sessionID: "" }).success).toBe(false);
        expect(baptemeRequestSchema.safeParse({ ...valid, planeID: "" }).success).toBe(false);
    });
});

// ─── Interrupteur « baptême » à la création d'une séance ───

describe("natureOfTheftForBapteme — interrupteur de NewSession", () => {
    it("activé : pose le seul marqueur DISCOVERY", () => {
        expect(natureOfTheftForBapteme(true)).toEqual([NatureOfTheft.DISCOVERY]);
    });

    it("désactivé : ne laisse aucun type de vol résiduel", () => {
        expect(natureOfTheftForBapteme(false)).toEqual([]);
    });

    it("le marqueur produit rend bien le créneau visible côté public", () => {
        // Contrat entre l'interrupteur et getPublicBaptemeSlots (has: DISCOVERY) :
        // si l'un des deux change, ce test casse.
        const slot = makeSlot({ natureOfTheft: natureOfTheftForBapteme(true) });
        expect(isBaptemeSlotAvailable(slot, [clubPlane], [], now)).toBe(true);
        expect(isBaptemeSlot(slot.natureOfTheft)).toBe(true);

        const nonBapteme = makeSlot({ natureOfTheft: natureOfTheftForBapteme(false) });
        expect(isBaptemeSlotAvailable(nonBapteme, [clubPlane], [], now)).toBe(false);
        expect(isBaptemeSlot(nonBapteme.natureOfTheft)).toBe(false);
    });

    it("aller-retour activé → désactivé : le créneau redevient invisible du public", () => {
        let nature = natureOfTheftForBapteme(true);
        expect(isBaptemeSlot(nature)).toBe(true);
        nature = natureOfTheftForBapteme(false);
        expect(isBaptemeSlot(nature)).toBe(false);
    });
});

// ─── Durée du hold ───

describe("computeHoldExpiry — durée de blocage d'un créneau", () => {
    it("le hold dure 24 h", () => {
        expect(HOLD_TTL_MINUTES).toBe(24 * 60);
        expect(computeHoldExpiry(now).toISOString()).toBe("2026-07-23T12:00:00.000Z");
    });

    it("une demande créée maintenant est encore active 23 h 59 plus tard", () => {
        const expiresAt = computeHoldExpiry(now);
        const presqueEchu = new Date(now.getTime() + (HOLD_TTL_MINUTES - 1) * 60 * 1000);
        expect(isHoldExpired({ status: "PENDING", expiresAt }, presqueEchu)).toBe(false);
    });

    it("elle est expirée une minute après l'échéance", () => {
        const expiresAt = computeHoldExpiry(now);
        const apres = new Date(expiresAt.getTime() + 60 * 1000);
        expect(isHoldExpired({ status: "PENDING", expiresAt }, apres)).toBe(true);
        expect(hasActiveHold([{ status: "PENDING", expiresAt }], apres)).toBe(false);
    });
});

// ─── Libellé public d'un créneau ───

describe("formatBaptemeSlotLabel — sélecteur de la page publique", () => {
    const slot = {
        sessionDateStart: new Date("2026-08-12T14:00:00.000Z"),
        durationMin: 60,
        pilotFirstName: "Luc",
        pilotLastName: "Dupont",
    };

    it("affiche date, plage horaire et pilote", () => {
        expect(formatBaptemeSlotLabel(slot)).toBe(
            "mercredi 12 août · 14:00 → 15:00 · Luc DUPONT"
        );
    });

    it("lit les horaires en UTC (pas de décalage selon le fuseau du visiteur)", () => {
        // 22:30 UTC = 00:30 le lendemain à Paris : la date ne doit pas basculer.
        const tard = { ...slot, sessionDateStart: "2026-08-12T22:30:00.000Z", durationMin: 30 };
        expect(formatBaptemeSlotLabel(tard)).toBe(
            "mercredi 12 août · 22:30 → 23:00 · Luc DUPONT"
        );
    });

    it("accepte une date sérialisée (props serveur → composant client)", () => {
        expect(formatBaptemeSlotLabel({ ...slot, sessionDateStart: "2026-08-12T14:00:00.000Z" })).toBe(
            formatBaptemeSlotLabel(slot)
        );
    });

    it("formatPilotName : prénom puis nom en capitales, comme dans l'email", () => {
        expect(formatPilotName("Luc", "Dupont")).toBe("Luc DUPONT");
        expect(formatPilotName("Anne-Marie", "de la Tour")).toBe("Anne-Marie DE LA TOUR");
    });
});
