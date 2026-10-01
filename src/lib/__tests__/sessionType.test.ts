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
 * Product rule: the slot marker is only a possibility, the booking determines
 * the flight type.
 */
describe("resolveSessionKind — tant que personne n'est inscrit", () => {
    it("créneau libre → type non déterminé", () => {
        expect(resolveSessionKind(makeSession({ studentID: null }))).toBe("UNDETERMINED");
    });

    it("créneau baptême encore libre → toujours non déterminé", () => {
        // The slot is offered to the public, but a club student can still take it:
        // nothing is settled.
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
        // The slot is blocked by the hold: the type is settled, only validation is
        // missing.
        expect(
            resolveSessionKind(makeSession({ ...baptemeSlot, studentID: BAPTEME_HOLD_STUDENT_ID }))
        ).toBe("BAPTEME");
    });

    it("élève du club sur un créneau BAPTÊME → Instruction, pas Baptême", () => {
        // Heart of the rule: the slot was offered for discovery flights, but a member
        // took it, so it is an instruction flight.
        expect(resolveSessionKind(makeSession({ ...baptemeSlot, studentID: MEMBER }))).toBe(
            "INSTRUCTION"
        );
    });

    it("invité externe sur un créneau ORDINAIRE → Instruction, pas Baptême", () => {
        // "+ External guest" (AddStudent) sets the same sentinel without the club having
        // declared a discovery flight: both conditions are required.
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
