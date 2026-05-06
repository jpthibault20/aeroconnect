import { describe, it, expect } from "vitest";
import { filterPilotePlane, getFreePlanesUsers } from "../popupCalendar";
import { flight_sessions, planes, User, userRole } from "@prisma/client";

// --- Helpers pour créer des données de test ---

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
    canSubscribeWithoutPlan: false,
    licenseExpiry: null,
    medicalExpiry: null,
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
    classes: null,
    flightComment: null,
    natureOfTheft: [],
    ...overrides,
});

// --- Tests filterPilotePlane ---

describe("filterPilotePlane", () => {
    it("retourne vide si aucune session", async () => {
        const result = await filterPilotePlane([], [], []);
        expect(result).toEqual({ pilotes: [], planes: [] });
    });

    it("retourne les pilotes et avions des sessions disponibles", async () => {
        const pilot = makeUser({ id: "pilot-1", role: userRole.INSTRUCTOR });
        const plane = makePlane({ id: "plane-1" });
        const session = makeSession({ pilotID: "pilot-1", planeID: ["plane-1"], studentID: null });

        const result = await filterPilotePlane([session], [pilot], [plane]);
        expect(result.pilotes).toHaveLength(1);
        expect(result.pilotes[0].id).toBe("pilot-1");
        expect(result.planes).toHaveLength(1);
        expect(result.planes[0].id).toBe("plane-1");
    });

    it("exclut les avions déjà assignés à un étudiant", async () => {
        const pilot = makeUser({ id: "pilot-1", role: userRole.INSTRUCTOR });
        const plane1 = makePlane({ id: "plane-1" });
        const plane2 = makePlane({ id: "plane-2", name: "C172" });

        const sessionAvailable = makeSession({
            id: "s1",
            pilotID: "pilot-1",
            planeID: ["plane-1", "plane-2"],
            studentID: null,
        });
        const sessionBooked = makeSession({
            id: "s2",
            pilotID: "pilot-1",
            planeID: ["plane-1"],
            studentID: "student-1",
            studentPlaneID: "plane-1",
        });

        const result = await filterPilotePlane(
            [sessionAvailable, sessionBooked],
            [pilot],
            [plane1, plane2]
        );
        expect(result.planes).toHaveLength(1);
        expect(result.planes[0].id).toBe("plane-2");
    });

    it("ignore les sessions déjà réservées pour les pilotes", async () => {
        const pilot = makeUser({ id: "pilot-1", role: userRole.INSTRUCTOR });
        const session = makeSession({ pilotID: "pilot-1", studentID: "student-1" });

        const result = await filterPilotePlane([session], [pilot], []);
        expect(result.pilotes).toHaveLength(0);
    });
});

// --- Tests getFreePlanesUsers ---

describe("getFreePlanesUsers", () => {
    it("retourne vide si props invalides", () => {
        const session = makeSession();
        const result = getFreePlanesUsers(session, [], null as any, null as any);
        expect(result).toEqual({ students: [], planes: [] });
    });

    it("retourne les étudiants libres (pas encore inscrits à ce créneau)", () => {
        const student1 = makeUser({ id: "stu-1", role: userRole.STUDENT });
        const student2 = makeUser({ id: "stu-2", role: userRole.STUDENT, firstName: "Marie" });
        const plane = makePlane({ id: "plane-1" });

        const session1 = makeSession({
            id: "s1",
            planeID: ["plane-1"],
            studentID: null,
        });
        const session2 = makeSession({
            id: "s2",
            planeID: ["plane-1"],
            studentID: "stu-1",
            studentPlaneID: "plane-1",
        });

        const result = getFreePlanesUsers(session1, [session1, session2], [student1, student2], [plane]);
        const studentIds = result.students.map(s => s.id);
        expect(studentIds).toContain("stu-2");
        expect(studentIds).not.toContain("stu-1");
    });

    it("exclut les admins et managers de la liste des étudiants", () => {
        const admin = makeUser({ id: "admin-1", role: userRole.ADMIN });
        const manager = makeUser({ id: "mgr-1", role: userRole.MANAGER });
        const student = makeUser({ id: "stu-1", role: userRole.STUDENT });

        const session = makeSession({ planeID: ["plane-1"] });

        const result = getFreePlanesUsers(session, [session], [admin, manager, student], []);
        const ids = result.students.map(s => s.id);
        expect(ids).toContain("stu-1");
        expect(ids).not.toContain("admin-1");
        expect(ids).not.toContain("mgr-1");
    });

    it("retourne les avions libres pour la session", () => {
        const plane1 = makePlane({ id: "plane-1" });
        const plane2 = makePlane({ id: "plane-2" });

        const session = makeSession({ planeID: ["plane-1", "plane-2"], studentID: null });

        const result = getFreePlanesUsers(session, [session], [], [plane1, plane2]);
        expect(result.planes).toHaveLength(2);
    });
});
