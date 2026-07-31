import { describe, it, expect } from "vitest";
import { NatureOfTheft } from "@prisma/client";
import {
    CLASSROOM_PLANE_ID,
    resolveSessionKind,
    SESSION_KIND_LABEL,
    type SessionKindLike,
} from "@/lib/sessionType";
import { natureOfTheftForBapteme, BAPTEME_HOLD_STUDENT_ID } from "@/lib/bapteme";
import { GUEST_STUDENT_ID } from "@/lib/sessionContacts";

const MEMBER = "student-1";

const makeSession = (over: Partial<SessionKindLike> = {}): SessionKindLike => ({
    planeID: ["p-club"],
    natureOfTheft: [],
    studentID: MEMBER,
    ...over,
});

const baptemeSlot = { natureOfTheft: [NatureOfTheft.DISCOVERY] };

/**
 * Règle produit : le marqueur du créneau n'est qu'une possibilité, c'est
 * l'inscription qui détermine la nature du vol.
 */
describe("resolveSessionKind — tant que personne n'est inscrit", () => {
    it("créneau libre → type non déterminé", () => {
        expect(resolveSessionKind(makeSession({ studentID: null }))).toBe("UNDETERMINED");
    });

    it("créneau baptême encore libre → toujours non déterminé", () => {
        // Le créneau est proposé au public, mais un élève du club peut encore le
        // prendre : rien n'est joué.
        expect(resolveSessionKind(makeSession({ ...baptemeSlot, studentID: null }))).toBe("UNDETERMINED");
    });

    it("séance en salle encore libre → non déterminé aussi", () => {
        expect(
            resolveSessionKind(makeSession({ planeID: [CLASSROOM_PLANE_ID], studentID: null }))
        ).toBe("UNDETERMINED");
    });

    it("un libellé neutre garde la colonne remplie", () => {
        expect(SESSION_KIND_LABEL.UNDETERMINED).toBe("Non défini");
    });
});

describe("resolveSessionKind — une fois quelqu'un inscrit", () => {
    it("élève du club sur un créneau ordinaire → Instruction", () => {
        expect(resolveSessionKind(makeSession())).toBe("INSTRUCTION");
    });

    it("client extérieur sur un créneau baptême → Baptême", () => {
        expect(
            resolveSessionKind(makeSession({ ...baptemeSlot, studentID: GUEST_STUDENT_ID }))
        ).toBe("BAPTEME");
    });

    it("demande de baptême encore en attente (hold) → déjà Baptême", () => {
        // Le créneau est bloqué par le hold : la nature est jouée, seule la
        // validation manque.
        expect(
            resolveSessionKind(makeSession({ ...baptemeSlot, studentID: BAPTEME_HOLD_STUDENT_ID }))
        ).toBe("BAPTEME");
    });

    it("élève du club sur un créneau BAPTÊME → Instruction, pas Baptême", () => {
        // Cœur de la règle : le créneau était proposé aux baptêmes, mais c'est un
        // membre qui l'a pris — le vol est de l'instruction.
        expect(resolveSessionKind(makeSession({ ...baptemeSlot, studentID: MEMBER }))).toBe(
            "INSTRUCTION"
        );
    });

    it("invité externe sur un créneau ORDINAIRE → Instruction, pas Baptême", () => {
        // « + Invité externe » (AddStudent) pose la même sentinelle sans que le
        // club ait déclaré un baptême : les deux conditions sont nécessaires.
        expect(resolveSessionKind(makeSession({ studentID: GUEST_STUDENT_ID }))).toBe("INSTRUCTION");
    });

    it("séance en salle avec un élève → Théorique", () => {
        expect(resolveSessionKind(makeSession({ planeID: [CLASSROOM_PLANE_ID] }))).toBe("THEORETICAL");
    });

    it("la salle de cours prime sur le marqueur baptême (état incohérent)", () => {
        expect(
            resolveSessionKind(
                makeSession({ ...baptemeSlot, planeID: [CLASSROOM_PLANE_ID], studentID: GUEST_STUDENT_ID })
            )
        ).toBe("THEORETICAL");
    });
});

describe("Cohérence avec l'interrupteur baptême de la création de séance", () => {
    it("interrupteur activé + client extérieur inscrit → « Baptême »", () => {
        const s = makeSession({
            natureOfTheft: natureOfTheftForBapteme(true),
            studentID: GUEST_STUDENT_ID,
        });
        expect(SESSION_KIND_LABEL[resolveSessionKind(s)]).toBe("Baptême");
    });

    it("interrupteur désactivé + élève inscrit → « Instruction »", () => {
        const s = makeSession({ natureOfTheft: natureOfTheftForBapteme(false) });
        expect(SESSION_KIND_LABEL[resolveSessionKind(s)]).toBe("Instruction");
    });
});

describe("Libellés", () => {
    it("les quatre états ont un libellé", () => {
        expect(SESSION_KIND_LABEL).toEqual({
            UNDETERMINED: "Non défini",
            THEORETICAL: "Théorique",
            BAPTEME: "Baptême",
            INSTRUCTION: "Instruction",
        });
    });
});
