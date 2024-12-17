"use client"
import { flight_sessions } from "@prisma/client";

export interface DayInfo {
    dayName: string;
    dayNumber: number;
    month: number; // Ajout du numéro du mois
    year: number;
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
            year: day.getFullYear(),
            isToday: day.toDateString() === currentDate.toDateString(), // Comparaison pour savoir si c'est aujourd'hui
        };

        daysOfWeek.push(dayInfo);
        date.setDate(date.getDate() + 1); // Passer au jour suivant
    }

    return daysOfWeek;
};

export const getSessionsFromDate = (date: Date, sessions: flight_sessions[]): flight_sessions[] => {
    return sessions?.filter((session) => {
        const sessionDate = session.sessionDateStart;

        // Comparer les dates (année, mois, jour)
        return sessionDate.getUTCFullYear() === date.getFullYear() &&
            sessionDate.getUTCMonth() === date.getMonth() &&
            sessionDate.getUTCDate() === date.getDate() &&
            sessionDate.getUTCHours() === date.getHours() &&
            sessionDate.getUTCMinutes() === date.getMinutes();
    });
};

type DayType = {
    date: number;
    day: string;
    month: string;
    year: number;
    isActualMonth: boolean;
    isActualDay: boolean;
    fullDate: Date
};

export type DaysOfMonthType = Array<DayType[]>;

export function getCompleteWeeks(date: Date) {
    const addDays = (d: Date, days: number): Date => {
        const dateCopy = new Date(d);
        dateCopy.setDate(dateCopy.getDate() + days);
        return dateCopy;
    };

    const getMonday = (d: Date): Date => {
        const dateCopy = new Date(d);
        const day = dateCopy.getDay();
        const diff = (day === 0 ? -6 : 1) - day; // Lundi comme premier jour
        dateCopy.setDate(dateCopy.getDate() + diff);
        return dateCopy;
    };

    const formatDay = (d: Date): string => {
        return d.toLocaleDateString('fr-FR', { weekday: 'long' });
    };

    const formatMonth = (d: Date): string => {
        return d.toLocaleDateString('fr-FR', { month: 'long' });
    };

    const isSameDay = (d1: Date, d2: Date): boolean => {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    const today = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    let currentMonday = getMonday(firstDayOfMonth);

    const weeks = [];

    // Tant que le lundi courant est dans le mois ou la semaine inclut des jours du mois courant
    while (currentMonday.getMonth() === month || addDays(currentMonday, 6).getMonth() === month) {
        const week = [];
        for (let i = 0; i < 7; i++) {
            const day = addDays(currentMonday, i);
            const isActualMonth = day.getMonth() === month;
            const isActualDay = isSameDay(day, today);

            week.push({
                date: day.getDate(),
                day: formatDay(day),
                month: formatMonth(day),
                year: day.getFullYear(),
                isActualMonth,
                isActualDay,
                fullDate: day,
            });
        }
        weeks.push(week); // Ajouter la semaine complète au tableau
        currentMonday = addDays(currentMonday, 7); // Passer au lundi suivant
    }

    return weeks;
}

export const getFlightSessionsForDay = (dayDate: Date, sessions: flight_sessions[]) => {
    return sessions.filter(session => {
        return (
            session.sessionDateStart.getUTCFullYear() === dayDate.getFullYear() &&
            session.sessionDateStart.getUTCMonth() === dayDate.getMonth() &&
            session.sessionDateStart.getUTCDate() === dayDate.getDate()
        );
    });
};

export const formatTime = (numberValue: number) => {
    const [hours, minutes] = numberValue.toString().split('.');
    const formattedHours = hours.padStart(2, '0');
    const formattedMinutes = minutes ? minutes.padEnd(2, '0') : '00';
    return `${formattedHours}:${formattedMinutes}`;
};

export const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
};