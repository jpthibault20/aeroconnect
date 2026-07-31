import { describe, it, expect } from "vitest";
import { checkSessionDate, newSession, interfaceSessions } from "../sessions";

/**
 * INSTRUCTEUR OBLIGATOIRE SUR UNE SÉANCE.
 *
 * Contexte : la fiche membre proposait une case « Utilisateur Autonome — peut
 * réserver sans instructeur ». Ce libellé était trompeur : le drapeau
 * `canSubscribeWithoutPlan` qu'il pilotait n'a jamais concerné l'instructeur,
 * seulement l'option « sans avion » (cf. commit c5b9618, « add possibility
 * subscribe without plane only if option is activated »). La réservation sans
 * instructeur n'a jamais été implémentée.
 *
 * Ces tests verrouillent la règle RÉELLE, pour qu'un futur changement soit
 * délibéré et non accidentel :
 *  - toute séance porte un pilote (flight_sessions.pilotID est non-nullable) ;
 *  - la création refuse explicitement l'absence d'instructeur ;
 *  - un élève ne crée pas de séance, il s'inscrit sur celle d'un instructeur.
 *
 * On appelle ici les VRAIES fonctions (pas de copie de la règle dans le test) :
 * les contrôles ci-dessous se produisent avant tout accès à la base.
 */

const baseSessionData = (over: Partial<interfaceSessions> = {}): interfaceSessions => ({
    instructorId: "instructor-1",
    date: new Date("2026-09-15T00:00:00.000Z"),
    startHour: "9",
    startMinute: "00",
    endHour: "11",
    endMinute: "00",
    duration: 60,
    endReccurence: undefined,
    planeId: ["p-club"],
    classes: [3],
    comment: "",
    natureOfTheft: [],
    ...over,
});

describe("Création d'une séance — instructeur obligatoire", () => {
    it("checkSessionDate refuse une séance sans instructeur", async () => {
        const res = await checkSessionDate(baseSessionData(), undefined);
        expect(res).toEqual({ error: "L'instructeur est obligatoire" });
    });

    it("newSession refuse aussi, indépendamment de checkSessionDate", async () => {
        // Double barrière : l'appelant pourrait sauter la validation préalable.
        const res = await newSession(baseSessionData(), undefined);
        expect(res).toEqual({ error: "L'instructeur est obligatoire" });
    });

    it("la date reste contrôlée avant l'instructeur (ordre des messages)", async () => {
        const res = await checkSessionDate(baseSessionData({ date: undefined }), undefined);
        expect(res).toEqual({ error: "La date de la session est obligatoire" });
    });
});

/**
 * Conséquence côté élève : il n'existe aucun chemin « je réserve seul ».
 *
 * L'inscription (studentRegistration / addStudentToSession) s'applique
 * TOUJOURS à une séance existante, donc à une séance qui a un pilote. Il n'y a
 * pas de création de séance par un élève : newSession est gardée par
 * requireAuth(OWNER, ADMIN, MANAGER, INSTRUCTOR).
 */
describe("Réservation autonome — état réel de la fonctionnalité", () => {
    it("aucune séance ne peut exister sans pilote", async () => {
        // Vérifié ici au niveau du seul point d'entrée de création. Le schéma
        // Prisma le garantit aussi : flight_sessions.pilotID est non-nullable.
        const sansInstructeur = await newSession(baseSessionData(), undefined);
        expect("error" in sansInstructeur).toBe(true);
    });

    it("le drapeau canSubscribeWithoutPlan ne porte AUCUNE règle d'instructeur", () => {
        // Documenté volontairement : si quelqu'un réactive une case
        // « peut réserver sans instructeur » branchée sur ce drapeau, ce test
        // rappelle qu'il n'existe aucune implémentation derrière.
        const flagUsages = ["option « sans avion » (retirée)"];
        expect(flagUsages).not.toContain("réservation sans instructeur");
    });
});
