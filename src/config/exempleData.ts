import { flightType } from "@prisma/client";

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

export const planeExemple = [
    {
        id: 1,
        clubId: 0,
        name: "P92",
        immatriculation: "F-HDPL",
        operational: true
    },
    {
        id: 2,
        clubId: 0,
        name: "Coyotte",
        immatriculation: "T-OVEL",
        operational: true
    },
    {
        id: 3,
        clubId: 0,
        name: "A320",
        immatriculation: "O-ABEL",
        operational: false
    },
    {
        id: 4,
        clubId: 0,
        name: "Savana",
        immatriculation: "N-UIYU",
        operational: true
    }
]

export const flightsSessionsExemple = [
    {
        id: 1,
        clubID: 101,
        sessionDateStart: new Date(2024, 10-1, 21, 17, 0, 0),
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
        clubID: 101,
        sessionDateStart: new Date(2024, 10-1, 21, 18, 0, 0),
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
        clubID: 101,
        sessionDateStart: new Date(2024, 10-1, 21, 19, 0, 0),
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
        clubID: 101,
        sessionDateStart: new Date(2024, 10-1, 24, 9, 0, 0),
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
        clubID: 101,
        sessionDateStart: new Date(2024, 10-1, 24, 10, 0, 0),
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
        clubID: 102,
        sessionDateStart: new Date(2024, 10-1, 25, 14, 0, 0),
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
        clubID: 103,
        sessionDateStart: new Date(2024, 10-1, 25, 11, 0, 0),
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
        clubID: 104,
        sessionDateStart: new Date(2024, 10-1, 26, 9, 0, 0),
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
        clubID: 104,
        sessionDateStart: new Date(2024, 10-1, 26, 16, 0, 0),
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
        clubID: 104,
        sessionDateStart: new Date(2024, 10-1, 26, 15, 0, 0),
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
        clubID: 105,
        sessionDateStart: new Date(2024, 10-1, 27, 12, 0, 0),
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
        clubID: 105,
        sessionDateStart: new Date(2024, 10-1, 27, 13, 0, 0),
        sessionDateDuration_min: 60,
        finalReccurence: new Date(2024, 11-1, 27, 13, 0, 0),
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
        id: 13,
        clubID: 105,
        sessionDateStart: new Date(2024, 10-1, 27, 13, 0, 0),
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
