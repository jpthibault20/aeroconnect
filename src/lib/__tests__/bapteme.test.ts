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
    baptemePilotKey,
    formatBaptemeSlotLabel,
    groupBaptemeSlots,
    listBaptemePilots,
    listBaptemePlanes,
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

// ─── isBaptemeSlotAvailable : les deux référentiels de temps ───

describe("isBaptemeSlotAvailable — slotNow (heure de pendule du club)", () => {
    // Les créneaux sont stockés en wall-clock UTC. Comparés à l'instant réel,
    // ceux d'il y a moins de 2 h (offset France l'été) passaient pour futurs.
    const slot = makeSlot({ sessionDateStart: "2026-08-12T15:00:00.000Z" });
    // 13:30Z = 15:30 à Paris en août : le créneau de 15:00 a commencé.
    const instantReel = new Date("2026-08-12T13:30:00.000Z");
    const penduleClub = new Date("2026-08-12T15:30:00.000Z");

    it("créneau commencé selon l'heure du club → indisponible", () => {
        expect(isBaptemeSlotAvailable(slot, [clubPlane], [], instantReel, penduleClub)).toBe(false);
    });

    it("sans slotNow, l'instant réel laisse passer le créneau dépassé (le bug)", () => {
        expect(isBaptemeSlotAvailable(slot, [clubPlane], [], instantReel)).toBe(true);
    });

    it("créneau encore à venir selon l'heure du club → disponible", () => {
        const plusTard = makeSlot({ sessionDateStart: "2026-08-12T16:00:00.000Z" });
        expect(isBaptemeSlotAvailable(plusTard, [clubPlane], [], instantReel, penduleClub)).toBe(true);
    });

    it("slotNow ne s'applique qu'à la date : un hold actif reste jugé sur l'instant réel", () => {
        const plusTard = makeSlot({ sessionDateStart: "2026-08-12T16:00:00.000Z" });
        const holds: BaptemeRequestLike[] = [
            { status: "PENDING", expiresAt: new Date("2026-08-12T14:00:00.000Z") },
        ];
        // Le hold expire à 14:00Z, soit après l'instant réel (13:30Z) : encore
        // actif. Jugé sur la pendule club (15:30Z) il paraîtrait expiré.
        expect(isBaptemeSlotAvailable(plusTard, [clubPlane], holds, instantReel, penduleClub)).toBe(false);
    });

    it("par défaut slotNow vaut now (comportement inchangé pour les appelants existants)", () => {
        expect(isBaptemeSlotAvailable(makeSlot(), [clubPlane], [], now)).toBe(
            isBaptemeSlotAvailable(makeSlot(), [clubPlane], [], now, now)
        );
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

    it("exclut les machines déjà prises à cet horaire par une autre session", () => {
        const planes = [makePlane({ id: "p1", classes: 3 }), makePlane({ id: "p2", classes: 3 })];
        expect(filterBaptemePlanes(planes, slot, ["p1"]).map((p) => p.id)).toEqual(["p2"]);
    });

    it("sans machine occupée, le comportement est inchangé", () => {
        const planes = [makePlane({ id: "p1", classes: 3 })];
        expect(filterBaptemePlanes(planes, slot, [])).toHaveLength(1);
    });
});

// ─── Conflit d'appareil entre deux créneaux simultanés ───

describe("isBaptemeSlotAvailable — machines déjà engagées à cet horaire", () => {
    it("créneau dont l'unique machine est déjà prise ailleurs → indisponible", () => {
        expect(isBaptemeSlotAvailable(makeSlot(), [clubPlane], [], now, now, ["p-club"])).toBe(false);
    });

    it("créneau conservant une machine libre → disponible", () => {
        const slot = makeSlot({ planeID: ["p-club", "p-autre"] });
        const planes = [clubPlane, makePlane({ id: "p-autre" })];
        expect(isBaptemeSlotAvailable(slot, planes, [], now, now, ["p-club"])).toBe(true);
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

// ─── groupBaptemeSlots ───

describe("groupBaptemeSlots", () => {
    const slot = (sessionID: string, start: string, pilotFirstName = "Luc") => ({
        sessionID,
        sessionDateStart: start,
        durationMin: 60,
        pilotFirstName,
        pilotLastName: "Dupont",
    });

    it("regroupe par jour puis par horaire", () => {
        const days = groupBaptemeSlots([
            slot("s1", "2026-08-12T14:00:00.000Z"),
            slot("s2", "2026-08-12T16:00:00.000Z"),
            slot("s3", "2026-08-13T09:00:00.000Z"),
        ]);

        expect(days.map((d) => d.dayKey)).toEqual(["2026-08-12", "2026-08-13"]);
        expect(days[0].times.map((t) => t.timeKey)).toEqual(["14:00", "16:00"]);
        expect(days[1].times.map((t) => t.timeKey)).toEqual(["09:00"]);
    });

    it("fusionne deux pilotes sur le même horaire en une seule entrée", () => {
        const days = groupBaptemeSlots([
            slot("s1", "2026-08-12T14:00:00.000Z", "Luc"),
            slot("s2", "2026-08-12T14:00:00.000Z", "Marie"),
        ]);

        expect(days[0].times).toHaveLength(1);
        expect(days[0].times[0].sessions.map((s) => s.pilotFirstName)).toEqual(["Luc", "Marie"]);
    });

    it("trie jours et horaires quel que soit l'ordre reçu", () => {
        const days = groupBaptemeSlots([
            slot("s3", "2026-08-13T09:00:00.000Z"),
            slot("s2", "2026-08-12T16:00:00.000Z"),
            slot("s1", "2026-08-12T08:00:00.000Z"),
        ]);

        expect(days.map((d) => d.dayKey)).toEqual(["2026-08-12", "2026-08-13"]);
        expect(days[0].times.map((t) => t.timeKey)).toEqual(["08:00", "16:00"]);
    });

    it("groupe en UTC : un créneau de fin de soirée reste sur son jour", () => {
        // 23:30 wall-clock : une lecture en heure locale (UTC+2) le basculerait
        // au lendemain 01:30.
        const days = groupBaptemeSlots([slot("s1", "2026-08-12T23:30:00.000Z")]);
        expect(days[0].dayKey).toBe("2026-08-12");
        expect(days[0].times[0].timeKey).toBe("23:30");
    });

    it("liste vide → aucun jour", () => {
        expect(groupBaptemeSlots([])).toEqual([]);
    });
});

// ─── Catalogues des points d'entrée « par appareil » / « par pilote » ───

describe("listBaptemePlanes", () => {
    const slot = (planes: { id: string; name: string }[]) => ({ planes });

    it("dédoublonne les machines partagées par plusieurs créneaux", () => {
        const planes = listBaptemePlanes([
            slot([{ id: "p1", name: "Alpha" }, { id: "p2", name: "Bravo" }]),
            slot([{ id: "p1", name: "Alpha" }]),
        ]);
        expect(planes.map((p) => p.id)).toEqual(["p1", "p2"]);
    });

    it("trie par nom", () => {
        const planes = listBaptemePlanes([
            slot([{ id: "p2", name: "Zoulou" }, { id: "p1", name: "Alpha" }]),
        ]);
        expect(planes.map((p) => p.name)).toEqual(["Alpha", "Zoulou"]);
    });

    it("aucun créneau → aucune machine", () => {
        expect(listBaptemePlanes([])).toEqual([]);
    });
});

describe("listBaptemePilots", () => {
    const slot = (pilotFirstName: string, pilotLastName: string) => ({
        pilotFirstName,
        pilotLastName,
    });

    it("dédoublonne un pilote présent sur plusieurs créneaux", () => {
        const pilots = listBaptemePilots([
            slot("Luc", "Dupont"),
            slot("Luc", "Dupont"),
            slot("Marie", "Martin"),
        ]);
        expect(pilots.map((p) => p.key)).toEqual(["Luc DUPONT", "Marie MARTIN"]);
    });

    it("la clé est le nom affiché (pas d'identifiant interne exposé)", () => {
        expect(baptemePilotKey("Luc", "Dupont")).toBe("Luc DUPONT");
        expect(listBaptemePilots([slot("Luc", "Dupont")])[0].key).toBe("Luc DUPONT");
    });

    it("conserve prénom et nom bruts pour l'affichage", () => {
        const [pilot] = listBaptemePilots([slot("Luc", "Dupont")]);
        expect(pilot.firstName).toBe("Luc");
        expect(pilot.lastName).toBe("Dupont");
    });

    it("aucun créneau → aucun pilote", () => {
        expect(listBaptemePilots([])).toEqual([]);
    });
});

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
