"use client"
import { FLIGHT_SESSION } from "@prisma/client";

export interface DayInfo {
    dayName: string;
    dayNumber: number;
    month: number; // Ajout du numéro du mois
    isToday: boolean;
}

export const getDaysOfWeek = (inputDate: Date): DayInfo[] => {
    const date = new Date(inputDate);
    const currentDate = new Date();
    const daysOfWeek: DayInfo[] = [];

    // Trouver le premier jour de la semaine (lundi)
    const dayOfWeek = (date.getDay() + 6) % 7; // 0 = dimanche, 1 = lundi, ..., 6 = samedi
    date.setDate(date.getDate() - dayOfWeek); // Reculer jusqu'au lundi

    // Parcourir les 7 jours de la semaine
    for (let i = 0; i < 7; i++) {
        // Cloner la date pour éviter les effets de bord
        const day = new Date(date.getTime());

        const dayInfo: DayInfo = {
            dayName: day.toLocaleString('default', { weekday: 'long' }), // Nom du jour
            dayNumber: day.getDate(), // Numéro du jour
            month: day.getMonth(), // Numéro du mois (ajouter 1 car getMonth() est zéro-indexé)
            isToday: day.toDateString() === currentDate.toDateString(), // Comparaison pour savoir si c'est aujourd'hui
        };

        daysOfWeek.push(dayInfo);
        date.setDate(date.getDate() + 1); // Passer au jour suivant
    }

    return daysOfWeek;
};

export const getSessionsFromDate = (date: Date, sessions: FLIGHT_SESSION[]): FLIGHT_SESSION[] => {
    console.log(date.toLocaleString('default'))
    console.log(sessions)
    return sessions.filter((session) => {
        const sessionDate = session.sessionDateStart;

        // Comparer les dates (année, mois, jour)
        return sessionDate.getFullYear() === date.getFullYear() &&
            sessionDate.getMonth() === date.getMonth() &&
            sessionDate.getDate() === date.getDate() &&
            sessionDate.getHours() === date.getHours() &&
            sessionDate.getMinutes() === date.getMinutes();
    });
};


