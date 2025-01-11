import { env } from "process";

// Liste des classes possibles
export const aircraftClasses = [
    {
        id: 1,
        label: "Paramoteur",
        handle: "Classe ULM",
        color: "#E9D5FF", // Equivalent HEX pour bg-purple-100
    },
    {
        id: 2,
        label: "Pendulaire",
        handle: "Classe ULM",
        color: "#DBEAFE", // Equivalent HEX pour bg-blue-100
    },
    {
        id: 3,
        label: "Multiaxe",
        handle: "Classe ULM",
        color: "#D1FAE5", // Equivalent HEX pour bg-green-100
    },
    {
        id: 4,
        label: "Autogire",
        handle: "Classe ULM",
        color: "#FECACA", // Equivalent HEX pour bg-red-100
    },
    {
        id: 5,
        label: "Aerostat",
        handle: "Classe ULM",
        color: "#FEF9C3", // Equivalent HEX pour bg-yellow-100
    },
    {
        id: 6,
        label: "Hélicoptère",
        handle: "Classe ULM",
        color: "#FED7AA", // Equivalent HEX pour bg-orange-100
    },
];


// Minutes et heures par défaut
export const defaultMinutes = ['00', '15', '30', '45']
export const defaultHours = [
    9, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 19.0
]

// Liste des mois et jours
export const monthFr = [ "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
export const dayFr = [ "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

// Adresse de l'envoi du mail
export const senderMailAdress = env.SENDER_EMAIL