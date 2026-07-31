import { describe, it, expect } from "vitest";
import { userRole } from "@prisma/client";
import {
    canSeePilotContact,
    canSeeStudentContact,
    isGuestStudent,
    resolveSessionContacts,
    GUEST_STUDENT_ID,
    type SessionContactLike,
    type MemberLike,
} from "@/lib/sessionContacts";
import { BAPTEME_HOLD_STUDENT_ID } from "@/lib/bapteme";

const PILOT = "pilot-1";
const STUDENT = "student-1";

const members: MemberLike[] = [
    { id: PILOT, firstName: "Luc", lastName: "Dupont", email: "luc@club.fr", phone: "0601020304" },
    { id: STUDENT, firstName: "Marie", lastName: "Martin", email: "marie@club.fr", phone: "0605060708" },
];

const makeSession = (over: Partial<SessionContactLike> = {}): SessionContactLike => ({
    pilotID: PILOT,
    pilotFirstName: "Luc",
    pilotLastName: "Dupont",
    studentID: STUDENT,
    studentFirstName: "Marie",
    studentLastName: "Martin",
    studentEmail: null,
    studentPhone: null,
    ...over,
});

const viewer = (id: string, role: userRole = userRole.PILOT) => ({ id, role });

describe("Visibilité des coordonnées d'une séance", () => {
    it("l'instructeur de la séance voit les coordonnées de SON élève", () => {
        const contacts = resolveSessionContacts(makeSession(), viewer(PILOT, userRole.INSTRUCTOR), members);
        expect(contacts).toHaveLength(1);
        expect(contacts[0].role).toBe("student");
        expect(contacts[0].phone).toBe("0605060708");
        expect(contacts[0].email).toBe("marie@club.fr");
    });

    it("l'élève inscrit voit les coordonnées de SON instructeur", () => {
        const contacts = resolveSessionContacts(makeSession(), viewer(STUDENT, userRole.STUDENT), members);
        expect(contacts).toHaveLength(1);
        expect(contacts[0].role).toBe("pilot");
        expect(contacts[0].phone).toBe("0601020304");
    });

    it("un membre non concerné par la séance ne voit AUCUNE coordonnée", () => {
        for (const role of [userRole.USER, userRole.STUDENT, userRole.PILOT, userRole.INSTRUCTOR]) {
            expect(resolveSessionContacts(makeSession(), viewer("autre", role), members)).toHaveLength(0);
        }
    });

    it("la gestion voit les deux, même sans lien avec la séance", () => {
        for (const role of [userRole.ADMIN, userRole.OWNER, userRole.MANAGER]) {
            const contacts = resolveSessionContacts(makeSession(), viewer("gestion", role), members);
            expect(contacts.map((c) => c.role)).toEqual(["pilot", "student"]);
        }
    });

    it("on ne renvoie jamais ses propres coordonnées", () => {
        // Gestionnaire qui est aussi le pilote de la séance : il ne voit que l'élève.
        const contacts = resolveSessionContacts(makeSession(), viewer(PILOT, userRole.OWNER), members);
        expect(contacts.map((c) => c.role)).toEqual(["student"]);
    });

    it("séance sans élève : rien à afficher pour l'instructeur", () => {
        const contacts = resolveSessionContacts(
            makeSession({ studentID: null, studentFirstName: null, studentLastName: null }),
            viewer(PILOT, userRole.INSTRUCTOR),
            members
        );
        expect(contacts).toHaveLength(0);
    });
});

describe("Client extérieur (baptême)", () => {
    it("les coordonnées d'un client validé sont lues sur la séance, pas sur les membres", () => {
        const session = makeSession({
            studentID: GUEST_STUDENT_ID,
            studentFirstName: "Paul",
            studentLastName: "Client",
            studentEmail: "paul@exemple.fr",
            studentPhone: "0611223344",
        });
        const contacts = resolveSessionContacts(session, viewer(PILOT, userRole.INSTRUCTOR), members);
        expect(contacts).toHaveLength(1);
        expect(contacts[0].label).toBe("Client");
        expect(contacts[0].email).toBe("paul@exemple.fr");
        expect(contacts[0].phone).toBe("0611223344");
    });

    it("un hold baptême en attente est traité comme un client extérieur", () => {
        expect(isGuestStudent(BAPTEME_HOLD_STUDENT_ID)).toBe(true);
        expect(isGuestStudent(GUEST_STUDENT_ID)).toBe(true);
        expect(isGuestStudent(STUDENT)).toBe(false);
        expect(isGuestStudent(null)).toBe(false);
    });
});

describe("Coordonnées manquantes", () => {
    it("un membre sans téléphone renvoie phone null (l'UI affiche « non renseigné »)", () => {
        const sansTel: MemberLike[] = [
            members[0],
            { ...members[1], phone: null },
        ];
        const contacts = resolveSessionContacts(makeSession(), viewer(PILOT, userRole.INSTRUCTOR), sansTel);
        expect(contacts[0].phone).toBeNull();
        expect(contacts[0].email).toBe("marie@club.fr");
    });

    it("un membre introuvable dans la liste ne casse pas le rendu", () => {
        const contacts = resolveSessionContacts(makeSession(), viewer(PILOT, userRole.INSTRUCTOR), []);
        expect(contacts).toHaveLength(1);
        expect(contacts[0].name).toBe("MARTIN Marie");
        expect(contacts[0].phone).toBeNull();
    });
});

describe("Prédicats de visibilité (utilisés aussi hors rendu)", () => {
    it("canSeeStudentContact : pilote de la séance ou gestion", () => {
        const s = makeSession();
        expect(canSeeStudentContact(s, viewer(PILOT, userRole.INSTRUCTOR))).toBe(true);
        expect(canSeeStudentContact(s, viewer(STUDENT, userRole.STUDENT))).toBe(false);
        expect(canSeeStudentContact(s, viewer("gestion", userRole.MANAGER))).toBe(true);
    });

    it("canSeePilotContact : élève inscrit ou gestion", () => {
        const s = makeSession();
        expect(canSeePilotContact(s, viewer(STUDENT, userRole.STUDENT))).toBe(true);
        expect(canSeePilotContact(s, viewer("autre", userRole.PILOT))).toBe(false);
        expect(canSeePilotContact(s, viewer("gestion", userRole.ADMIN))).toBe(true);
    });
});
