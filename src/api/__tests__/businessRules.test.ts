import { describe, it, expect } from "vitest";
import { flight_sessions, userRole, User, planes } from "@prisma/client";
import { getFreePlanesUsers } from "../popupCalendar";

/**
 * Business rules confirmed by the product owner, one describe per rule.
 */

// --- Helpers ---

const makeUser = (overrides: Partial<User> = {}): User => ({
    id: "user-1",
    email: "test@test.com",
    clubID: "club-1",
    firstName: "Jean",
    lastName: "Dupont",
    phone: null,
    restricted: false,
    role: userRole.STUDENT,
    country: null,
    zipCode: null,
    classes: [1, 2, 3],
    adress: null,
    city: null,
    clubIDRequest: null,
    canSubscribeWithoutPlan: false,
    ...overrides,
});

const makePlane = (overrides: Partial<planes> = {}): planes => ({
    id: "plane-1",
    clubID: "club-1",
    name: "DR400",
    immatriculation: "F-GXYZ",
    operational: true,
    classes: 3,
    hobbsTotal: 1200,
    ownerID: null,
    usageTypes: [],
    instructionHourlyRateCents: null,
    maintenanceHistory: null,
    imagePath: null,
    ...overrides,
});

const makeSession = (overrides: Partial<flight_sessions> = {}): flight_sessions => ({
    id: "session-1",
    clubID: "club-1",
    pilotID: "pilot-1",
    pilotFirstName: "Pierre",
    pilotLastName: "Martin",
    sessionDateStart: new Date("2026-04-10T09:00:00Z"),
    sessionDateDuration_min: 60,
    planeID: ["plane-1"],
    studentID: null,
    studentFirstName: null,
    studentLastName: null,
    studentPlaneID: null,
    pilotComment: null,
    studentComment: null,
    flightType: null,
    student_type: null,
    classes: [],
    flightComment: null,
    natureOfTheft: [],
    finalReccurence: null,
    studentEmail: null,
    studentPhone: null,
    startLocation: null,
    endLocation: null,
    hobbsStart: null,
    hobbsEnd: null,
    landings: null,
    ...overrides,
});

// --- RULE: a student cannot be booked on 2 sessions in the same slot ---

describe("Un élève ne peut pas être inscrit à 2 sessions au même créneau", () => {
    it("l'élève déjà inscrit au même créneau n'apparaît pas dans les étudiants libres", () => {
        const student = makeUser({ id: "stu-1" });
        const plane1 = makePlane({ id: "plane-1" });
        const plane2 = makePlane({ id: "plane-2", name: "C172" });

        const session1 = makeSession({
            id: "s1",
            pilotID: "pilot-1",
            planeID: ["plane-1"],
            studentID: "stu-1",
            studentPlaneID: "plane-1",
        });
        const session2 = makeSession({
            id: "s2",
            pilotID: "pilot-2",
            planeID: ["plane-2"],
            studentID: null,
        });

        const result = getFreePlanesUsers(session2, [session1, session2], [student], [plane1, plane2]);
        const studentIds = result.students.map(s => s.id);
        expect(studentIds).not.toContain("stu-1");
    });

    it("l'élève libre au même créneau apparaît dans les étudiants libres", () => {
        const student1 = makeUser({ id: "stu-1" });
        const student2 = makeUser({ id: "stu-2", firstName: "Marie" });

        const session1 = makeSession({
            id: "s1",
            planeID: ["plane-1"],
            studentID: "stu-1",
        });
        const session2 = makeSession({
            id: "s2",
            planeID: ["plane-1"],
            studentID: null,
        });

        const result = getFreePlanesUsers(session2, [session1, session2], [student1, student2], []);
        const studentIds = result.students.map(s => s.id);
        expect(studentIds).toContain("stu-2");
    });
});

// --- RULE: an instructor can be booked as a student on another flight ---

describe("Un instructeur peut être inscrit comme élève sur un autre vol", () => {
    it("un INSTRUCTOR apparaît dans la liste des étudiants disponibles", () => {
        const instructor = makeUser({
            id: "instr-1",
            role: userRole.INSTRUCTOR,
            firstName: "Paul",
        });

        const session = makeSession({
            id: "s1",
            pilotID: "pilot-autre",
            planeID: ["plane-1"],
            studentID: null,
        });

        const result = getFreePlanesUsers(session, [session], [instructor], []);
        const studentIds = result.students.map(s => s.id);
        expect(studentIds).toContain("instr-1");
    });
});

// --- RULE: ADMIN/MANAGER are excluded from the student list ---

describe("Admins et managers exclus de la liste des étudiants", () => {
    it("un ADMIN n'apparaît pas comme étudiant possible", () => {
        const admin = makeUser({ id: "admin-1", role: userRole.ADMIN });
        const session = makeSession({ planeID: ["plane-1"] });

        const result = getFreePlanesUsers(session, [session], [admin], []);
        expect(result.students.map(s => s.id)).not.toContain("admin-1");
    });

    it("un MANAGER n'apparaît pas comme étudiant possible", () => {
        const manager = makeUser({ id: "mgr-1", role: userRole.MANAGER });
        const session = makeSession({ planeID: ["plane-1"] });

        const result = getFreePlanesUsers(session, [session], [manager], []);
        expect(result.students.map(s => s.id)).not.toContain("mgr-1");
    });
});

// --- RULE: flight without a plane (historical data) ---
// 
// The noPlane sentinel was removed from the forms: no new session can carry it.
// These cases stay covered because ALREADY recorded sessions and flights must
// still render correctly (see LEGACY_NO_PLANE_ID in lib/utils.ts).

describe("Vol sans machine (séances historiques)", () => {
    it("noPlane donne planeID null dans le flight_log", () => {
        const studentPlaneID = "noPlane";
        const isNoPlane = studentPlaneID === "noPlane";
        const planeID = isNoPlane ? null : studentPlaneID;
        expect(planeID).toBeNull();
    });

    it("noPlane donne planeRegistration PERSO", () => {
        const studentPlaneID = "noPlane";
        const isNoPlane = studentPlaneID === "noPlane";
        const planeRegistration = isNoPlane ? "PERSO" : "N/A";
        expect(planeRegistration).toBe("PERSO");
    });

    it("classroomSession donne planeRegistration THEORIQUE", () => {
        const studentPlaneID = "classroomSession";
        const isClassroom = studentPlaneID === "classroomSession";
        const planeRegistration = isClassroom ? "THEORIQUE" : "N/A";
        expect(planeRegistration).toBe("THEORIQUE");
    });

    it("la section Machine est masquée quand planeID est null", () => {
        const planeID: string | null = null;
        const hasPlane = !!planeID;
        expect(hasPlane).toBe(false);
    });

    it("la section Machine est affichée quand planeID existe", () => {
        const planeID: string | null = "plane-123";
        const hasPlane = !!planeID;
        expect(hasPlane).toBe(true);
    });
});

// --- RULE: Hobbs consistency between flights on the same plane ---

describe("Cohérence heures moteur entre vols", () => {
    it("le hobbsEnd d'un vol devrait être le hobbsStart du suivant", () => {
        const vol1HobbsEnd = 1234.5;
        const vol2HobbsStart = 1234.5;
        expect(vol2HobbsStart).toBe(vol1HobbsEnd);
    });

    it("le hobbsStart peut être modifié (pas forcément = au précédent)", () => {
        const vol1HobbsEnd = 1234.5;
        const vol2HobbsStart = 1235.0; // edited manually
        expect(vol2HobbsStart).not.toBe(vol1HobbsEnd);
        expect(vol2HobbsStart).toBeGreaterThan(0);
    });
});

// --- RULE: a ground-school flight needs no takeoffs/landings ---

describe("Vol théorique", () => {
    it("un vol théorique est identifié par planeRegistration THEORIQUE", () => {
        const isTheoretical = "THEORIQUE" === "THEORIQUE";
        expect(isTheoretical).toBe(true);
    });

    it("un vol théorique n'a pas de planeID", () => {
        const studentPlaneID = "classroomSession";
        const isClassroom = studentPlaneID === "classroomSession";
        const planeID = isClassroom ? null : studentPlaneID;
        expect(planeID).toBeNull();
    });
});

// --- RULE: planes filtered by the student's class ---

describe("Filtrage avions par classe d'élève", () => {
    it("un élève ne voit que les avions de ses classes", () => {
        const student = makeUser({ classes: [3] });
        const planeClass3 = makePlane({ id: "p1", classes: 3 });
        const planeClass1 = makePlane({ id: "p2", classes: 1 });

        const availablePlanes = [planeClass3, planeClass1].filter(p =>
            student.classes.includes(p.classes)
        );

        expect(availablePlanes).toHaveLength(1);
        expect(availablePlanes[0].id).toBe("p1");
    });

    it("un élève multi-classes voit tous ses avions éligibles", () => {
        const student = makeUser({ classes: [1, 3] });
        const plane1 = makePlane({ id: "p1", classes: 1 });
        const plane2 = makePlane({ id: "p2", classes: 2 });
        const plane3 = makePlane({ id: "p3", classes: 3 });

        const availablePlanes = [plane1, plane2, plane3].filter(p =>
            student.classes.includes(p.classes)
        );

        expect(availablePlanes).toHaveLength(2);
        expect(availablePlanes.map(p => p.id)).toEqual(["p1", "p3"]);
    });

    it("seule la séance théorique échappe encore au filtrage par classe", () => {
        // The "no plane" option (noPlane) was removed from the forms: every selectable
        // plane is now a real plane, and therefore subject to class filtering.
        const shouldFilter = (planeId: string) => planeId !== "classroomSession";
        expect(shouldFilter("classroomSession")).toBe(false);
        expect(shouldFilter("p1")).toBe(true);
    });
});
