import { flightType, userRole } from "@prisma/client";

export interface Plane {
    id: number;
    clubId: string;
    name: string;
    immatriculation: string;
    operational: boolean;
}

export const instructorExemple = [
    "Jeanpierre Stephane",
    "Jeanpierre Thibault",
    "Exemple Roussel"
]

export const StudentExemple = [
    "Jeanpierre Stephane",
    "Jeanpierre Thibault",
    "Exemple Roussel"
]

export const UserExemple = [
    {
        id: 1,
        email: "stephane@primservice.fr",
        adressID: 101,
        clubID: "LF5722",
        firstName: "stephane",
        lastName: "jeanpierre",
        phone: "611106199",
        restricted: false,
        role: userRole.PILOT,
        city: "",
        adress: "",
        country: "",
        zipCode: "",
    },
    {
        id: 2,
        email: "marie@primservice.fr",
        adressID: 102,
        clubID: "LF5722",
        firstName: "marie",
        lastName: "dupont",
        phone: "612345678",
        restricted: false,
        role: userRole.STUDENT,
        city: "",
        adress: "",
        country: "",
        zipCode: "",
    },
    {
        id: 3,
        email: "jean@primservice.fr",
        adressID: 103,
        clubID: "LF5722",
        firstName: "jean",
        lastName: "durand",
        phone: "621987654",
        restricted: true,
        role: userRole.STUDENT,
        city: "",
        adress: "",
        country: "",
        zipCode: "",
    },
    {
        id: 4,
        email: "paul@primservice.fr",
        adressID: 104,
        clubID: "LF5722",
        firstName: "paul",
        lastName: "martin",
        phone: "634567890",
        restricted: false,
        role: userRole.STUDENT,
        city: "",
        adress: "",
        country: "",
        zipCode: "",
    },
    {
        id: 5,
        email: "laura@primservice.fr",
        adressID: 105,
        clubID: "LF5722",
        firstName: "laura",
        lastName: "bernard",
        phone: "645678901",
        restricted: false,
        role: userRole.OWNER,
        city: "",
        adress: "",
        country: "",
        zipCode: "",
    }
];

export const flightsSessionsExemple = [
    {
        id: 1,
        clubID: "LF5722",
        sessionDateStart: new Date(2024, 10 - 1, 21, 17, 0, 0),
        sessionDateDuration_min: 60,
        finalReccurence: null,
        flightType: flightType.TRAINING, // Exemple de flightType
        pilotID: 14,
        pilotFirstName: 'Thibault',
        pilotLastName: 'Jeanpierre',
        studentID: 601,
        studentFirstName: 'Alice',
        studentLastName: 'Smith',
        student_type: flightType.TRAINING, // Exemple de student_type
        planeID: 1,
        planeName: 'SAVANA'
    },
    {
        id: 2,
        clubID: "LF5722",
        sessionDateStart: new Date(2024, 10 - 1, 21, 18, 0, 0),
        sessionDateDuration_min: 60,
        finalReccurence: null,
        flightType: flightType.TRAINING, // Exemple de flightType
        pilotID: 14,
        pilotFirstName: 'Thibault',
        pilotLastName: 'Jeanpierre',
        studentID: 601,
        studentFirstName: 'Alice',
        studentLastName: 'Smith',
        student_type: flightType.TRAINING, // Exemple de student_type
        planeID: 1,
        planeName: 'SAVANA'
    },
    {
        id: 3,
        clubID: "LF5722",
        sessionDateStart: new Date(2024, 10 - 1, 21, 19, 0, 0),
        sessionDateDuration_min: 60,
        finalReccurence: null,
        flightType: flightType.TRAINING, // Exemple de flightType
        pilotID: 14,
        pilotFirstName: 'Thibault',
        pilotLastName: 'Jeanpierre',
        studentID: 601,
        studentFirstName: 'Alice',
        studentLastName: 'Smith',
        student_type: flightType.TRAINING, // Exemple de student_type
        planeID: 1,
        planeName: 'SAVANA'
    },
    {
        id: 4,
        clubID: "LF5722",
        sessionDateStart: new Date(2024, 10 - 1, 24, 9, 0, 0),
        sessionDateDuration_min: 60,
        finalReccurence: null,
        flightType: flightType.TRAINING, // Exemple de flightType
        pilotID: 14,
        pilotFirstName: 'Thibault',
        pilotLastName: 'Jeanpierre',
        studentID: 601,
        studentFirstName: 'Alice',
        studentLastName: 'Smith',
        student_type: flightType.TRAINING, // Exemple de student_type
        planeID: 1,
        planeName: 'SAVANA'
    },
    {
        id: 5,
        clubID: "LF5722",
        sessionDateStart: new Date(2024, 10 - 1, 24, 10, 0, 0),
        sessionDateDuration_min: 60,
        finalReccurence: null,
        flightType: flightType.TRAINING, // Exemple de flightType
        pilotID: 14,
        pilotFirstName: 'Thibault',
        pilotLastName: 'Jeanpierre',
        studentID: 601,
        studentFirstName: 'Alice',
        studentLastName: 'Smith',
        student_type: flightType.TRAINING, // Exemple de student_type
        planeID: 1,
        planeName: 'SAVANA'
    },
    {
        id: 6,
        clubID: "LF5722",
        sessionDateStart: new Date(2024, 10 - 1, 25, 14, 0, 0),
        sessionDateDuration_min: 60,
        finalReccurence: null,
        flightType: flightType.TRAINING,
        pilotID: 14,
        pilotFirstName: 'Thibault',
        pilotLastName: 'Jeanpierre',
        studentID: 602,
        studentFirstName: 'Bob',
        studentLastName: 'Johnson',
        student_type: flightType.TRAINING,
        planeID: 9,
        planeName: 'A320'
    },
    {
        id: 7,
        clubID: "LF5722",
        sessionDateStart: new Date(2024, 10 - 1, 25, 11, 0, 0),
        sessionDateDuration_min: 60,
        finalReccurence: null,
        flightType: flightType.TRAINING,
        pilotID: 14,
        pilotFirstName: 'Thibault',
        pilotLastName: 'Jeanpierre',
        studentID: null,
        studentFirstName: null,
        studentLastName: null,
        student_type: null,
        planeID: 1,
        planeName: 'P92'
    },
    {
        id: 8,
        clubID: "LF5722",
        sessionDateStart: new Date(2024, 10 - 1, 26, 9, 0, 0),
        sessionDateDuration_min: 60,
        finalReccurence: null,
        flightType: flightType.TRAINING,
        pilotID: 14,
        pilotFirstName: 'Thibault',
        pilotLastName: 'Jeanpierre',
        studentID: null,
        studentFirstName: null,
        studentLastName: null,
        student_type: null,
        planeID: 3,
        planeName: 'SAVANA'
    },
    {
        id: 9,
        clubID: "LF5722",
        sessionDateStart: new Date(2024, 10 - 1, 26, 16, 0, 0),
        sessionDateDuration_min: 60,
        finalReccurence: null,
        flightType: flightType.TRAINING,
        pilotID: 14,
        pilotFirstName: 'Thibault',
        pilotLastName: 'Jeanpierre',
        studentID: null,
        studentFirstName: null,
        studentLastName: null,
        student_type: null,
        planeID: 3,
        planeName: 'COYOTTE'
    },
    {
        id: 10,
        clubID: "LF5722",
        sessionDateStart: new Date(2024, 10 - 1, 26, 15, 0, 0),
        sessionDateDuration_min: 60,
        finalReccurence: null,
        flightType: flightType.TRAINING,
        pilotID: 14,
        pilotFirstName: 'Thibault',
        pilotLastName: 'Jeanpierre',
        studentID: null,
        studentFirstName: null,
        studentLastName: null,
        student_type: null,
        planeID: 3,
        planeName: 'P92'
    },
    {
        id: 11,
        clubID: "LF5722",
        sessionDateStart: new Date(2024, 10 - 1, 27, 12, 0, 0),
        sessionDateDuration_min: 60,
        finalReccurence: null,
        flightType: flightType.TRAINING,
        pilotID: 14,
        pilotFirstName: 'Thibault',
        pilotLastName: 'Jeanpierre',
        studentID: 5678,
        studentFirstName: 'Sophie',
        studentLastName: 'Turner',
        student_type: flightType.TRAINING,
        planeID: 0,
        planeName: 'P92'
    },
    {
        id: 12,
        clubID: "LF5722",
        sessionDateStart: new Date(2024, 10 - 1, 27, 13, 0, 0),
        sessionDateDuration_min: 60,
        finalReccurence: new Date(2024, 11 - 1, 27, 13, 0, 0),
        flightType: flightType.TRAINING,
        pilotID: 14,
        pilotFirstName: 'Thibault',
        pilotLastName: 'Jeanpierre',
        studentID: null,
        studentFirstName: '',
        studentLastName: '',
        student_type: null,
        planeID: 0,
        planeName: 'P92'
    },
    {
        id: 13,
        clubID: "LF5722",
        sessionDateStart: new Date(2024, 10 - 1, 27, 13, 0, 0),
        sessionDateDuration_min: 60,
        finalReccurence: null,
        flightType: flightType.TRAINING,
        pilotID: 15,
        pilotFirstName: 'stephane',
        pilotLastName: 'Jeanpierre',
        studentID: null,
        studentFirstName: null,
        studentLastName: null,
        student_type: null,
        planeID: 1,
        planeName: 'P92'
    }
];
