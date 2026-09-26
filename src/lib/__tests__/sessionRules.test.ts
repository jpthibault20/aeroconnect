import { describe, it, expect } from "vitest";
import { userRole } from "@prisma/client";
import {
    canCreateSessionsFor,
    checkStudentRegistration,
    checkStudentRemoval,
    resolveCommentUpdate,
    RegistrationContext,
    RemovalContext,
} from "@/lib/sessionRules";
import { ALL_CLUB_PLANES_SENTINEL } from "@/lib/planeVisibility";

/**
 * Slot action rules (AER-67). The server actions re-read session, club, user and
 * plane from the DB then apply these rules: nothing depends on an object sent by
 * the browser anymore.
 */

// Club clock time: 15/06/2026 10:00. Slot the next day at 10:00.
const now = new Date("2026-06-15T10:00:00Z");
const tomorrow = new Date("2026-06-16T10:00:00Z");

const clubPlane = { id: "p-club", clubID: "club-1", ownerID: null, operational: true, classes: 3 };

const registration = (overrides: Partial<RegistrationContext> = {}): RegistrationContext => ({
    user: { id: "s1", role: userRole.STUDENT, restricted: false, clubID: "club-1", classes: [3] },
    club: { userCanSubscribe: true, timeDelaySubscribeminutes: 0 },
    session: { clubID: "club-1", sessionDateStart: tomorrow, studentID: null, planeID: ["p-club", "classroomSession"] },
    planeID: "p-club",
    plane: clubPlane,
    clubPlanes: [{ id: "p-club", ownerID: null }],
    now,
    hasConflict: false,
    heldByBapteme: false,
    ...overrides,
});

const expectRefused = (res: ReturnType<typeof checkStudentRegistration>, text?: string) => {
    expect(res.ok).toBe(false);
    if (!res.ok && text) expect(res.error).toContain(text);
};

describe("checkStudentRegistration — inscription par l'utilisateur connecté", () => {
    it("autorise un cas nominal", () => {
        expect(checkStudentRegistration(registration())).toEqual({ ok: true });
    });

    it("refuse un créneau d'un autre club", () => {
        const res = checkStudentRegistration(registration({ session: { ...registration().session, clubID: "club-2" } }));
        expectRefused(res, "non accessible");
    });

    it("refuse un utilisateur sans club", () => {
        expectRefused(checkStudentRegistration(registration({ user: { ...registration().user, clubID: null } })));
    });

    it("refuse un utilisateur restreint", () => {
        expectRefused(checkStudentRegistration(registration({ user: { ...registration().user, restricted: true } })), "restricted");
    });

    it("refuse si le club a désactivé les inscriptions", () => {
        expectRefused(checkStudentRegistration(registration({ club: { userCanSubscribe: false, timeDelaySubscribeminutes: 0 } })), "désactivées");
    });

    it("refuse un rôle non autorisé (visiteur, manager)", () => {
        for (const role of [userRole.USER, userRole.MANAGER]) {
            expectRefused(checkStudentRegistration(registration({ user: { ...registration().user, role } })), "E_003");
        }
    });

    it("refuse si le délai d'inscription n'est pas respecté", () => {
        const res = checkStudentRegistration(registration({ club: { userCanSubscribe: true, timeDelaySubscribeminutes: 25 * 60 } }));
        expectRefused(res, "minimum");
    });

    it("refuse un créneau passé", () => {
        const past = { ...registration().session, sessionDateStart: new Date("2026-06-15T09:00:00Z") };
        expectRefused(checkStudentRegistration(registration({ session: past })));
    });

    it("refuse en cas de conflit, de baptême en attente ou de créneau déjà pris", () => {
        expectRefused(checkStudentRegistration(registration({ hasConflict: true })), "Conflit");
        expectRefused(checkStudentRegistration(registration({ heldByBapteme: true })), "baptême");
        const taken = { ...registration().session, studentID: "s2" };
        expectRefused(checkStudentRegistration(registration({ session: taken })), "déjà réservé");
    });

    describe("machine", () => {
        it("séance théorique : autorisée si proposée sur le créneau", () => {
            expect(checkStudentRegistration(registration({ planeID: "classroomSession", plane: null })).ok).toBe(true);
            const noClassroom = { ...registration().session, planeID: ["p-club"] };
            expectRefused(checkStudentRegistration(registration({ planeID: "classroomSession", plane: null, session: noClassroom })));
        });

        it("refuse une machine non proposée sur le créneau", () => {
            const other = { ...clubPlane, id: "p-other" };
            expectRefused(checkStudentRegistration(registration({ planeID: "p-other", plane: other })), "pas proposée");
        });

        it("marqueur « toutes les machines du club » : machine du club acceptée", () => {
            const other = { ...clubPlane, id: "p-other" };
            const session = { ...registration().session, planeID: [ALL_CLUB_PLANES_SENTINEL] };
            const res = checkStudentRegistration(registration({
                planeID: "p-other", plane: other, session,
                clubPlanes: [{ id: "p-club", ownerID: null }, { id: "p-other", ownerID: null }],
            }));
            expect(res.ok).toBe(true);
        });

        it("refuse une machine d'un autre club, introuvable ou désactivée", () => {
            expectRefused(checkStudentRegistration(registration({ plane: { ...clubPlane, clubID: "club-2" } })));
            expectRefused(checkStudentRegistration(registration({ plane: null })));
            expectRefused(checkStudentRegistration(registration({ plane: { ...clubPlane, operational: false } })), "désactivé");
        });

        it("machine privée : acceptée pour son propriétaire, même non proposée par le créneau", () => {
            const own = { ...clubPlane, id: "p-own", ownerID: "s1" };
            expect(checkStudentRegistration(registration({ planeID: "p-own", plane: own })).ok).toBe(true);
        });

        it("refuse la machine privée d'un autre membre", () => {
            const foreign = { ...clubPlane, id: "p-foreign", ownerID: "s2" };
            expectRefused(checkStudentRegistration(registration({ planeID: "p-foreign", plane: foreign })), "ne vous appartient pas");
        });

        it("refuse une machine d'une classe sur laquelle l'élève n'est pas qualifié", () => {
            expectRefused(checkStudentRegistration(registration({ user: { ...registration().user, classes: [1] } })), "qualifié");
        });
    });
});

const removal = (overrides: Partial<RemovalContext> = {}): RemovalContext => ({
    user: { id: "s1", role: userRole.STUDENT, clubID: "club-1" },
    club: { userCanUnsubscribe: true, timeDelayUnsubscribeminutes: 60 },
    session: { clubID: "club-1", studentID: "s1", sessionDateStart: tomorrow },
    now,
    ...overrides,
});

describe("checkStudentRemoval — désinscription", () => {
    it("un élève peut retirer sa propre inscription dans les délais", () => {
        expect(checkStudentRemoval(removal())).toEqual({ ok: true });
    });

    it("un élève ne peut PAS désinscrire un autre élève", () => {
        const res = checkStudentRemoval(removal({ session: { ...removal().session, studentID: "s2" } }));
        expect(res).toEqual({ ok: false, error: "Vous ne pouvez désinscrire que vous-même." });
    });

    it("refuse un créneau d'un autre club, même pour la gestion", () => {
        const otherClub = { ...removal().session, clubID: "club-2" };
        expect(checkStudentRemoval(removal({ session: otherClub })).ok).toBe(false);
        expect(checkStudentRemoval(removal({ session: otherClub, user: { id: "o1", role: userRole.OWNER, clubID: "club-1" } })).ok).toBe(false);
    });

    it("refuse s'il n'y a personne à désinscrire", () => {
        expect(checkStudentRemoval(removal({ session: { ...removal().session, studentID: null } })).ok).toBe(false);
    });

    it("respecte l'interdiction et le délai fixés par le club pour l'élève", () => {
        expect(checkStudentRemoval(removal({ club: { userCanUnsubscribe: false, timeDelayUnsubscribeminutes: 0 } })).ok).toBe(false);
        expect(checkStudentRemoval(removal({ club: { userCanUnsubscribe: true, timeDelayUnsubscribeminutes: 25 * 60 } })).ok).toBe(false);
    });

    it("le personnel du club désinscrit n'importe quel élève, sans délai", () => {
        for (const role of [userRole.INSTRUCTOR, userRole.MANAGER, userRole.OWNER, userRole.ADMIN]) {
            const res = checkStudentRemoval(removal({
                user: { id: "staff", role, clubID: "club-1" },
                session: { ...removal().session, studentID: "s2" },
                club: { userCanUnsubscribe: false, timeDelayUnsubscribeminutes: 25 * 60 },
            }));
            expect(res.ok).toBe(true);
        }
    });
});

describe("resolveCommentUpdate — notes d'un créneau", () => {
    const session = { clubID: "club-1", pilotID: "instr", studentID: "s1", pilotComment: "note pilote", studentComment: "note élève" };
    const ctx = (user: { id: string; role: userRole; clubID: string | null }) =>
        resolveCommentUpdate({ user, session, pilotComment: "NOUVEAU pilote", studentComment: "NOUVEAU élève" });

    it("l'élève ne modifie que sa note : celle du pilote reste celle en base", () => {
        expect(ctx({ id: "s1", role: userRole.STUDENT, clubID: "club-1" })).toEqual({
            ok: true, data: { pilotComment: "note pilote", studentComment: "NOUVEAU élève" },
        });
    });

    it("le pilote ne modifie que sa note", () => {
        expect(ctx({ id: "instr", role: userRole.INSTRUCTOR, clubID: "club-1" })).toEqual({
            ok: true, data: { pilotComment: "NOUVEAU pilote", studentComment: "note élève" },
        });
    });

    it("la gestion modifie les deux", () => {
        expect(ctx({ id: "m1", role: userRole.MANAGER, clubID: "club-1" })).toEqual({
            ok: true, data: { pilotComment: "NOUVEAU pilote", studentComment: "NOUVEAU élève" },
        });
    });

    it("refuse un membre non concerné ou d'un autre club", () => {
        expect(ctx({ id: "s9", role: userRole.STUDENT, clubID: "club-1" }).ok).toBe(false);
        expect(ctx({ id: "o2", role: userRole.OWNER, clubID: "club-2" }).ok).toBe(false);
    });
});

describe("canCreateSessionsFor — création de créneaux", () => {
    const MANAGERS = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER];

    it("un instructeur crée pour lui-même, pas pour un autre", () => {
        const instr = { id: "i1", role: userRole.INSTRUCTOR, clubID: "club-1" };
        expect(canCreateSessionsFor(instr, { id: "i1", clubID: "club-1" }, MANAGERS).ok).toBe(true);
        expect(canCreateSessionsFor(instr, { id: "i2", clubID: "club-1" }, MANAGERS).ok).toBe(false);
    });

    it("la gestion crée pour un instructeur de son club uniquement", () => {
        const owner = { id: "o1", role: userRole.OWNER, clubID: "club-1" };
        expect(canCreateSessionsFor(owner, { id: "i2", clubID: "club-1" }, MANAGERS).ok).toBe(true);
        expect(canCreateSessionsFor(owner, { id: "i3", clubID: "club-2" }, MANAGERS).ok).toBe(false);
    });

    it("instructeur introuvable en base : refus", () => {
        expect(canCreateSessionsFor({ id: "o1", role: userRole.OWNER, clubID: "club-1" }, null, MANAGERS).ok).toBe(false);
    });
});
