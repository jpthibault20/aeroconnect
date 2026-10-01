import { describe, it, expect } from "vitest";
import { userRole } from "@prisma/client";
import { filterPlanesForBeneficiary } from "@/lib/planeVisibility";

/**
 * Planes offered when booking a student.
 *
 * Rule: the list is computed from the BENEFICIARY's point of view (the one who
 * will fly), never the one entering it. Use case: a manager books over the phone
 * a student who owns their own plane.
 */

const STUDENT = "student-1";
const OTHER = "other-1";

const plane = (over: Partial<{ id: string; ownerID: string | null; classes: number }> = {}) => ({
    id: "p-club",
    ownerID: null as string | null,
    classes: 3,
    ...over,
});

const clubPlane = plane({ id: "p-club", classes: 3 });
const studentPlane = plane({ id: "p-perso", ownerID: STUDENT, classes: 3 });
const otherPrivatePlane = plane({ id: "p-autre", ownerID: OTHER, classes: 3 });

const student = (classes = [3]) => ({ id: STUDENT, role: userRole.STUDENT, classes });

// The slot only offers the club plane: the real case, the instructor does not see
// the student's private plane when creating the session.
const slot = { offeredPlaneIDs: ["p-club"] };

const ids = <T extends { id: string }>(list: T[]) => list.map((p) => p.id).sort();

describe("filterPlanesForBeneficiary — machine personnelle de l'élève", () => {
    it("propose la machine de l'élève même si le créneau ne l'offre pas", () => {
        const res = filterPlanesForBeneficiary([clubPlane, studentPlane], student(), slot);
        expect(ids(res)).toEqual(["p-club", "p-perso"]);
    });

    it("ne propose jamais la machine privée d'un tiers", () => {
        const res = filterPlanesForBeneficiary(
            [clubPlane, studentPlane, otherPrivatePlane],
            student(),
            slot
        );
        expect(ids(res)).not.toContain("p-autre");
    });

    it("la classe reste exigée, y compris sur SA propre machine", () => {
        // Owning a plane does not exempt from being rated on it.
        const perso = plane({ id: "p-perso", ownerID: STUDENT, classes: 6 });
        const res = filterPlanesForBeneficiary([clubPlane, perso], student([3]), slot);
        expect(ids(res)).toEqual(["p-club"]);
    });

    it("une machine du club non proposée sur le créneau reste exclue", () => {
        // The instructor chooses which club planes they make available.
        const autreClub = plane({ id: "p-club-2", classes: 3 });
        const res = filterPlanesForBeneficiary([clubPlane, autreClub], student(), slot);
        expect(ids(res)).toEqual(["p-club"]);
    });

    it("une machine déjà prise sur le même horaire est exclue, perso comprise", () => {
        const res = filterPlanesForBeneficiary([clubPlane, studentPlane], student(), {
            ...slot,
            unavailablePlaneIDs: ["p-perso"],
        });
        expect(ids(res)).toEqual(["p-club"]);
    });
});

describe("filterPlanesForBeneficiary — indépendance vis-à-vis de celui qui saisit", () => {
    it("le résultat ne dépend QUE du bénéficiaire", () => {
        // Same call whatever the manager's role: the function does not receive the
        // current user, that is the heart of the fix.
        const attendu = ids(filterPlanesForBeneficiary([clubPlane, studentPlane], student(), slot));
        expect(attendu).toEqual(["p-club", "p-perso"]);
    });

    it("un élève sans machine personnelle voit exactement l'offre du créneau", () => {
        const sansPerso = { id: "student-2", role: userRole.STUDENT, classes: [3] };
        const res = filterPlanesForBeneficiary(
            [clubPlane, studentPlane, otherPrivatePlane],
            sansPerso,
            slot
        );
        expect(ids(res)).toEqual(["p-club"]);
    });

    it("un élève sans aucune classe autorisée n'a aucune machine", () => {
        const res = filterPlanesForBeneficiary([clubPlane, studentPlane], student([]), slot);
        expect(res).toHaveLength(0);
    });
});

describe("filterPlanesForBeneficiary — cas des rôles de supervision", () => {
    it("un président bénéficiaire voit les privées des autres SI le créneau les propose", () => {
        // canViewPlane lets OWNER/ADMIN see every private plane; the "offered on the
        // slot" rule still applies to them.
        const president = { id: "pres", role: userRole.OWNER, classes: [3] };
        const res = filterPlanesForBeneficiary([otherPrivatePlane], president, {
            offeredPlaneIDs: ["p-autre"],
        });
        expect(ids(res)).toEqual(["p-autre"]);
    });

    it("… mais pas si le créneau ne les propose pas", () => {
        const president = { id: "pres", role: userRole.OWNER, classes: [3] };
        const res = filterPlanesForBeneficiary([otherPrivatePlane], president, {
            offeredPlaneIDs: [],
        });
        expect(res).toHaveLength(0);
    });
});
