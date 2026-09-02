import { describe, it, expect } from "vitest";
import { userRole } from "@prisma/client";
import {
    canViewPlane,
    canManagePlane,
    filterVisiblePlanes,
    canCreatePrivatePlane,
    canCreateClubPlane,
    canCreateAnyPlane,
    canEditPlaneHobbs,
    isPrivatePlane,
} from "@/lib/planeVisibility";
import {
    canAccessLogbookPage,
    canManageLogbook,
    canAddManualLogEntry,
    canSeeAircraftLogbook,
    isLogbookReadOnly,
    shouldPromptToSignFlights,
} from "@/lib/logbookPermissions";

/**
 * MATRICE DES CAPACITÉS PAR RÔLE — Machines & Carnet de vol.
 *
 * Ce fichier est organisé par rôle (ce que chaque rôle PEUT / NE PEUT PAS faire)
 * et importe les VRAIES fonctions de permission (pas de constantes « miroir »),
 * afin qu'un changement de règle casse le test.
 *
 * Périmètre : capacités introduites/impactées par le ticket « machines membres »
 *  - création de machine (privée vs club) ;
 *  - visibilité & gestion des machines (privé = propriétaire + OWNER/ADMIN) ;
 *  - accès carnet de vol + saisie manuelle (STUDENT non, PILOT oui).
 *
 * NON dupliqué ici (déjà couvert ailleurs) :
 *  - gestion/création de sessions, éligibilité à l'inscription → roleAccessMatrix / permissions
 *  - filtrage des avions par classe de l'élève → businessRules
 *  - vue du carnet d'un autre pilote, signature=identité, modif d'un vol signé → permissions
 *  - isolation inter-clubs générique → clubIsolation
 */

const CLUB = "club-1";
const OTHER_CLUB = "club-2";

const user = (role: userRole, id = "me", clubID = CLUB) => ({ id, role, clubID });

// Machines de référence (même club sauf mention contraire).
const clubPlane = { ownerID: null, clubID: CLUB };
const myPrivatePlane = { ownerID: "me", clubID: CLUB };
const othersPrivatePlane = { ownerID: "someone-else", clubID: CLUB };

// Reproduit la composition réelle des server actions : filtrage clubID PUIS
// filtrage de visibilité (cf. getPlanes / getAllPlanesOperational).
function visiblePlanesInClub<T extends { ownerID: string | null; clubID: string }>(
    all: T[],
    u: { id: string; role: userRole; clubID: string }
): T[] {
    return filterVisiblePlanes(all.filter((p) => p.clubID === u.clubID), u);
}

const ALL_ROLES = [
    userRole.USER, userRole.STUDENT, userRole.PILOT, userRole.INSTRUCTOR,
    userRole.MANAGER, userRole.ADMIN, userRole.OWNER,
];

// ─────────────────────────────────────────────────────────────
// USER (compte de base, sans réel accès club)
// ─────────────────────────────────────────────────────────────

describe("Rôle USER", () => {
    const role: userRole = userRole.USER;

    it("ne peut créer AUCUNE machine (ni privée, ni club)", () => {
        expect(canCreatePrivatePlane(role)).toBe(false);
        expect(canCreateClubPlane(role)).toBe(false);
        expect(canCreateAnyPlane(role)).toBe(false);
    });

    it("ne peut gérer aucune machine (il n'en possède aucune : USER ne crée rien)", () => {
        // Un USER n'est jamais propriétaire d'une machine (il ne peut pas en
        // créer) : on le teste donc comme non-propriétaire.
        const nonOwner = user(role, "user-x");
        expect(canManagePlane(clubPlane, nonOwner)).toBe(false);
        expect(canManagePlane(othersPrivatePlane, nonOwner)).toBe(false);
        expect(canViewPlane(othersPrivatePlane, nonOwner)).toBe(false);
    });

    it("n'a pas accès au carnet de vol (ni saisie)", () => {
        expect(canAccessLogbookPage(role)).toBe(false);
        expect(canAddManualLogEntry(role)).toBe(false);
        expect(canManageLogbook(role)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────
// STUDENT
// ─────────────────────────────────────────────────────────────

describe("Rôle STUDENT", () => {
    const role: userRole = userRole.STUDENT;

    it("peut créer une machine privée mais PAS une machine du club", () => {
        expect(canCreatePrivatePlane(role)).toBe(true);
        expect(canCreateClubPlane(role)).toBe(false);
    });

    it("gère sa propre machine privée, pas celle des autres ni le club", () => {
        expect(canManagePlane(myPrivatePlane, user(role))).toBe(true);
        expect(canManagePlane(othersPrivatePlane, user(role))).toBe(false);
        expect(canManagePlane(clubPlane, user(role))).toBe(false);
    });

    it("voit les machines du club + la sienne, pas la privée d'un autre", () => {
        const visible = visiblePlanesInClub(
            [clubPlane, myPrivatePlane, othersPrivatePlane],
            user(role)
        );
        expect(visible).toContain(clubPlane);
        expect(visible).toContain(myPrivatePlane);
        expect(visible).not.toContain(othersPrivatePlane);
    });

    it("accède au carnet en LECTURE SEULE et ne fait PAS de saisie manuelle", () => {
        // L'élève vole toujours avec un instructeur : vol auto-logué, il ne saisit
        // ni ne signe. Seul l'instructeur signe.
        expect(canAccessLogbookPage(role)).toBe(true);
        expect(isLogbookReadOnly(role)).toBe(true);
        expect(canAddManualLogEntry(role)).toBe(false);
        expect(canSeeAircraftLogbook(role)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────
// PILOT
// ─────────────────────────────────────────────────────────────

describe("Rôle PILOT", () => {
    const role: userRole = userRole.PILOT;

    it("peut créer une machine privée mais PAS une machine du club", () => {
        expect(canCreatePrivatePlane(role)).toBe(true);
        expect(canCreateClubPlane(role)).toBe(false);
    });

    it("gère sa propre machine privée (et peut voler sur les machines du club)", () => {
        expect(canManagePlane(myPrivatePlane, user(role))).toBe(true);
        expect(canManagePlane(othersPrivatePlane, user(role))).toBe(false);
        // Une machine du club est visible/réservable par le pilote.
        expect(canViewPlane(clubPlane, user(role))).toBe(true);
    });

    it("accède au carnet ET peut faire des saisies manuelles (son propre carnet)", () => {
        expect(canAccessLogbookPage(role)).toBe(true);
        expect(canAddManualLogEntry(role)).toBe(true);
        expect(isLogbookReadOnly(role)).toBe(false);
    });

    it("ne gère pas le carnet des autres ni le carnet de route machine", () => {
        expect(canManageLogbook(role)).toBe(false);
        expect(canSeeAircraftLogbook(role)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────
// INSTRUCTOR
// ─────────────────────────────────────────────────────────────

describe("Rôle INSTRUCTOR", () => {
    const role: userRole = userRole.INSTRUCTOR;

    it("peut créer une machine privée mais PAS une machine du club", () => {
        expect(canCreatePrivatePlane(role)).toBe(true);
        expect(canCreateClubPlane(role)).toBe(false);
    });

    it("gère sa propre machine privée, mais PAS la privée d'un autre", () => {
        // Comme le pilote : il gère les machines sur lesquelles il vole seul (les
        // siennes). Il ne supervise pas les machines privées d'autrui.
        expect(canManagePlane(myPrivatePlane, user(role))).toBe(true);
        expect(canManagePlane(othersPrivatePlane, user(role))).toBe(false);
        expect(canViewPlane(othersPrivatePlane, user(role))).toBe(false);
    });

    it("accède au carnet, saisie manuelle et carnet de route machine", () => {
        expect(canAccessLogbookPage(role)).toBe(true);
        expect(canAddManualLogEntry(role)).toBe(true);
        expect(canManageLogbook(role)).toBe(true);
        expect(canSeeAircraftLogbook(role)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────
// MANAGER
// ─────────────────────────────────────────────────────────────

describe("Rôle MANAGER", () => {
    const role: userRole = userRole.MANAGER;

    it("peut créer des machines du club ET des machines privées", () => {
        expect(canCreateClubPlane(role)).toBe(true);
        expect(canCreatePrivatePlane(role)).toBe(true);
    });

    it("gère les machines du club et les siennes, mais PAS la privée d'un autre", () => {
        expect(canManagePlane(clubPlane, user(role))).toBe(true);
        expect(canManagePlane(myPrivatePlane, user(role))).toBe(true);
        expect(canManagePlane(othersPrivatePlane, user(role))).toBe(false);
        // Le manager ne fait pas partie des rôles de supervision des privées.
        expect(canViewPlane(othersPrivatePlane, user(role))).toBe(false);
    });

    it("gère le carnet (saisie, carnet de route machine)", () => {
        expect(canManageLogbook(role)).toBe(true);
        expect(canAddManualLogEntry(role)).toBe(true);
        expect(canSeeAircraftLogbook(role)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────
// OWNER (président)
// ─────────────────────────────────────────────────────────────

describe("Rôle OWNER (président)", () => {
    const role: userRole = userRole.OWNER;

    it("peut créer machines du club et privées", () => {
        expect(canCreateClubPlane(role)).toBe(true);
        expect(canCreatePrivatePlane(role)).toBe(true);
    });

    it("voit et gère TOUTES les machines, y compris les privées des autres", () => {
        expect(canViewPlane(othersPrivatePlane, user(role))).toBe(true);
        expect(canManagePlane(othersPrivatePlane, user(role))).toBe(true);
        expect(canManagePlane(clubPlane, user(role))).toBe(true);
    });

    it("gère intégralement le carnet", () => {
        expect(canManageLogbook(role)).toBe(true);
        expect(canAddManualLogEntry(role)).toBe(true);
        expect(canSeeAircraftLogbook(role)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────

describe("Rôle ADMIN", () => {
    const role: userRole = userRole.ADMIN;

    it("voit et gère TOUTES les machines, y compris les privées des autres", () => {
        expect(canViewPlane(othersPrivatePlane, user(role))).toBe(true);
        expect(canManagePlane(othersPrivatePlane, user(role))).toBe(true);
        expect(canManagePlane(clubPlane, user(role))).toBe(true);
    });

    it("peut créer machines du club et privées, et gère le carnet", () => {
        expect(canCreateClubPlane(role)).toBe(true);
        expect(canCreatePrivatePlane(role)).toBe(true);
        expect(canManageLogbook(role)).toBe(true);
        expect(canAddManualLogEntry(role)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────
// TESTS GÉNÉRAUX (transversaux)
// ─────────────────────────────────────────────────────────────

describe("Général — visibilité des machines privées", () => {
    it("une machine privée n'est visible QUE par son propriétaire, le président et l'admin", () => {
        const owner = user(userRole.STUDENT, "me");
        // Propriétaire : oui.
        expect(canViewPlane(myPrivatePlane, owner)).toBe(true);
        // Président / admin : oui (supervision).
        expect(canViewPlane(myPrivatePlane, user(userRole.OWNER, "pres"))).toBe(true);
        expect(canViewPlane(myPrivatePlane, user(userRole.ADMIN, "adm"))).toBe(true);
        // Tous les autres rôles (non propriétaires) : non.
        for (const role of [userRole.USER, userRole.STUDENT, userRole.PILOT, userRole.INSTRUCTOR, userRole.MANAGER]) {
            expect(canViewPlane(myPrivatePlane, user(role, "autre"))).toBe(false);
        }
    });

    it("une machine du club est visible par tous les rôles du club", () => {
        for (const role of ALL_ROLES) {
            expect(canViewPlane(clubPlane, user(role, "x"))).toBe(true);
        }
    });

    it("isPrivatePlane distingue club (ownerID null) et privée", () => {
        expect(isPrivatePlane(clubPlane)).toBe(false);
        expect(isPrivatePlane(myPrivatePlane)).toBe(true);
    });
});

describe("Général — popup automatique « vols à signer »", () => {
    it("ne s'ouvre PAS pour un élève : il ne peut ni compléter ni signer", () => {
        expect(shouldPromptToSignFlights(userRole.STUDENT)).toBe(false);
        // Cohérence avec la lecture seule du carnet : même règle, une seule source.
        expect(isLogbookReadOnly(userRole.STUDENT)).toBe(true);
    });

    it("ne s'ouvre pas non plus pour un USER (aucun accès au carnet)", () => {
        expect(shouldPromptToSignFlights(userRole.USER)).toBe(false);
        expect(shouldPromptToSignFlights(undefined)).toBe(false);
    });

    it("s'ouvre pour tous les rôles qui signent réellement des vols", () => {
        for (const role of [
            userRole.PILOT, userRole.INSTRUCTOR,
            userRole.MANAGER, userRole.OWNER, userRole.ADMIN,
        ]) {
            expect(shouldPromptToSignFlights(role)).toBe(true);
        }
    });

    it("invariant : jamais proposée à quelqu'un en lecture seule", () => {
        for (const role of ALL_ROLES) {
            if (isLogbookReadOnly(role)) {
                expect(shouldPromptToSignFlights(role)).toBe(false);
            }
        }
    });

    it("l'élève garde l'accès à la page carnet (la popup seule est masquée)", () => {
        expect(canAccessLogbookPage(userRole.STUDENT)).toBe(true);
    });
});

describe("Général — correction du compteur horaire (hobbsTotal)", () => {
    it("le propriétaire d'une machine privée peut corriger le compteur de SA machine", () => {
        // Y compris un élève : c'est sa machine, il en relève le compteur.
        expect(canEditPlaneHobbs(myPrivatePlane, user(userRole.STUDENT, "me"))).toBe(true);
        expect(canEditPlaneHobbs(myPrivatePlane, user(userRole.PILOT, "me"))).toBe(true);
    });

    it("le propriétaire ne peut PAS corriger le compteur d'une machine du club", () => {
        for (const role of [userRole.STUDENT, userRole.PILOT, userRole.INSTRUCTOR, userRole.MANAGER]) {
            expect(canEditPlaneHobbs(clubPlane, user(role))).toBe(false);
        }
    });

    it("personne ne corrige le compteur de la machine privée d'un autre, sauf président/admin", () => {
        for (const role of [userRole.USER, userRole.STUDENT, userRole.PILOT, userRole.INSTRUCTOR, userRole.MANAGER]) {
            expect(canEditPlaneHobbs(othersPrivatePlane, user(role))).toBe(false);
        }
        expect(canEditPlaneHobbs(othersPrivatePlane, user(userRole.OWNER))).toBe(true);
        expect(canEditPlaneHobbs(othersPrivatePlane, user(userRole.ADMIN))).toBe(true);
    });

    it("président et admin corrigent le compteur de n'importe quelle machine", () => {
        for (const role of [userRole.OWNER, userRole.ADMIN]) {
            expect(canEditPlaneHobbs(clubPlane, user(role))).toBe(true);
            expect(canEditPlaneHobbs(myPrivatePlane, user(role))).toBe(true);
        }
    });
});

describe("Général — isolation inter-clubs", () => {
    it("aucun rôle ne voit les machines d'un autre club (même une machine du club)", () => {
        const foreignClubPlane = { ownerID: null, clubID: OTHER_CLUB };
        const foreignPrivatePlane = { ownerID: "me", clubID: OTHER_CLUB };
        for (const role of ALL_ROLES) {
            // Même le président/admin de club-1 ne voit rien de club-2 via cette liste.
            const visible = visiblePlanesInClub(
                [clubPlane, foreignClubPlane, foreignPrivatePlane],
                user(role, "me", CLUB)
            );
            expect(visible).not.toContain(foreignClubPlane);
            expect(visible).not.toContain(foreignPrivatePlane);
        }
    });

    it("le propriétaire d'une machine ne la voit pas s'il change de club", () => {
        const myPlaneInClub1 = { ownerID: "me", clubID: CLUB };
        const meInClub2 = user(userRole.STUDENT, "me", OTHER_CLUB);
        const visible = visiblePlanesInClub([myPlaneInClub1], meInClub2);
        expect(visible).toHaveLength(0);
    });
});

// ─────────────────────────────────────────────────────────────
// Carnet de route machine — accès élève propriétaire
// ─────────────────────────────────────────────────────────────

describe("Carnet de route machine (onglet 'Carnet de Vol Machine')", () => {
    it("un élève SANS machine privée n'a pas accès à l'onglet", () => {
        expect(canSeeAircraftLogbook(userRole.STUDENT)).toBe(false);
        expect(canSeeAircraftLogbook(userRole.STUDENT, { ownsPrivatePlane: false })).toBe(false);
    });

    it("un élève propriétaire d'une machine privée y a accès (en lecture seule)", () => {
        expect(canSeeAircraftLogbook(userRole.STUDENT, { ownsPrivatePlane: true })).toBe(true);
        // ... mais reste en lecture seule (pas d'édition/signature).
        expect(isLogbookReadOnly(userRole.STUDENT)).toBe(true);
    });

    it("les rôles de gestion y ont toujours accès et NE sont PAS en lecture seule", () => {
        for (const role of [userRole.INSTRUCTOR, userRole.MANAGER, userRole.OWNER, userRole.ADMIN]) {
            expect(canSeeAircraftLogbook(role)).toBe(true);
            expect(isLogbookReadOnly(role)).toBe(false);
        }
    });

    it("un PILOT n'accède à l'onglet que s'il possède une machine privée", () => {
        expect(canSeeAircraftLogbook(userRole.PILOT)).toBe(false);
        expect(canSeeAircraftLogbook(userRole.PILOT, { ownsPrivatePlane: true })).toBe(true);
    });
});
