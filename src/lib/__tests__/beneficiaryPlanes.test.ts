import { describe, it, expect } from "vitest";
import { userRole } from "@prisma/client";
import { filterPlanesForBeneficiary } from "@/lib/planeVisibility";

/**
 * Machines proposées à l'inscription d'un élève.
 *
 * Règle : la liste se calcule du point de vue du BÉNÉFICIAIRE (celui qui va
 * voler), jamais de celui qui saisit. Cas d'usage : un manager inscrit par
 * téléphone un élève qui possède sa propre machine.
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

// Le créneau ne propose que la machine du club : c'est le cas réel, l'instructeur
// ne voit pas la machine privée de l'élève au moment de créer la séance.
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
        // Posséder une machine ne dispense pas d'être qualifié dessus.
        const perso = plane({ id: "p-perso", ownerID: STUDENT, classes: 6 });
        const res = filterPlanesForBeneficiary([clubPlane, perso], student([3]), slot);
        expect(ids(res)).toEqual(["p-club"]);
    });

    it("une machine du club non proposée sur le créneau reste exclue", () => {
        // L'instructeur choisit les machines club qu'il met à disposition.
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
        // Même appel, quel que soit le rôle du gestionnaire : la fonction ne
        // reçoit pas l'utilisateur courant, c'est le cœur de la correction.
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
        // canViewPlane autorise OWNER/ADMIN à voir toutes les privées ; la règle
        // « proposée sur le créneau » continue de s'appliquer pour celles-ci.
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
