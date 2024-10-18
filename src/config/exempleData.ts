import { flightType } from "@prisma/client";

export const instructorExemple = [
    "Jeanpierre Stephane",
    "Jeanpierre Thibault",
    "Exemple Roussel"
]

export const planeExemple = [
    "P92",
    "Coyotte",
    "A320",
    "Savana"
]

export const flightsSessionsExemple = [
    {
        id: 1,
        clubID: 101,
        sessionDateStart: new Date(2024, 10-1, 14, 17, 0, 0),
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
        id: 1,
        clubID: 101,
        sessionDateStart: new Date(2024, 10-1, 14, 18, 0, 0),
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
        id: 1,
        clubID: 101,
        sessionDateStart: new Date(2024, 10-1, 14, 19, 0, 0),
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
        id: 1,
        clubID: 101,
        sessionDateStart: new Date(2024, 10-1, 17, 9, 0, 0),
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
        id: 1,
        clubID: 101,
        sessionDateStart: new Date(2024, 10-1, 17, 10, 0, 0),
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
        clubID: 102,
        sessionDateStart: new Date(2024, 10-1, 18, 14, 0, 0),
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
        id: 3,
        clubID: 103,
        sessionDateStart: new Date(2024, 10-1, 18, 11, 0, 0),
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
        id: 4,
        clubID: 104,
        sessionDateStart: new Date(2024, 10-1, 19, 9, 0, 0),
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
        id: 4,
        clubID: 104,
        sessionDateStart: new Date(2024, 10-1, 19, 16, 0, 0),
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
        id: 4,
        clubID: 104,
        sessionDateStart: new Date(2024, 10-1, 19, 15, 0, 0),
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
        id: 5,
        clubID: 105,
        sessionDateStart: new Date(2024, 10-1, 20, 12, 0, 0),
        sessionDateDuration_min: 60,
        finalReccurence: null,
        flightType: flightType.TRAINING,
        pilotID: 14,
        pilotFirstName: 'Thibault',
        pilotLastName: 'Jeanpierre',
        studentID: null,
        studentFirstName: 'Sophie',
        studentLastName: 'Turner',
        student_type: flightType.TRAINING,
        planeID: 0,
        planeName: 'P92'
    },
    {
        id: 5,
        clubID: 105,
        sessionDateStart: new Date(2024, 10-1, 20, 13, 0, 0),
        sessionDateDuration_min: 60,
        finalReccurence: null,
        flightType: flightType.TRAINING,
        pilotID: 14,
        pilotFirstName: 'Thibault',
        pilotLastName: 'Jeanpierre',
        studentID: null,
        studentFirstName: 'Sophie',
        studentLastName: 'Turner',
        student_type: flightType.TRAINING,
        planeID: 0,
        planeName: 'P92'
    },
    {
        id: 6,
        clubID: 105,
        sessionDateStart: new Date(2024, 10-1, 20, 13, 0, 0),
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
