"use client"
import { flight_sessions } from "@prisma/client";

export interface DayInfo {
    dayName: string;
    dayNumber: number;
    month: number;
    year: number;
    isToday: boolean;
}

export const getDaysOfWeek = (inputDate: Date): DayInfo[] => {
    const date = new Date(inputDate);
    const currentDate = new Date();
    const daysOfWeek: DayInfo[] = [];

    // Go back to the Monday of the week
    const dayOfWeek = (date.getDay() + 6) % 7; // 0 = Monday, ..., 6 = Sunday
    date.setDate(date.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
        // Clone the date to avoid side effects
        const day = new Date(date.getTime());

        const dayInfo: DayInfo = {
            dayName: day.toLocaleString('default', { weekday: 'long' }),
            dayNumber: day.getDate(),
            month: day.getMonth(), // 0-based
            year: day.getFullYear(),
            isToday: day.toDateString() === currentDate.toDateString(),
        };

        daysOfWeek.push(dayInfo);
        date.setDate(date.getDate() + 1);
    }

    return daysOfWeek;
};

/**
 * Sessions falling in the displayed week (Monday -> Sunday) of `date`.
 *
 * Same convention as getSessionsFromDate: `sessionDateStart` is stored as UTC
 * wall-clock, so its UTC parts are compared to the week days (which
 * getDaysOfWeek builds in local time).
 */
export const getSessionsOfWeek = (date: Date, sessions: flight_sessions[]): flight_sessions[] => {
    const days = new Set(
        getDaysOfWeek(date).map((d) => `${d.year}-${d.month}-${d.dayNumber}`)
    );
    return sessions.filter((session) => {
        const d = session.sessionDateStart;
        return days.has(`${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`);
    });
};

export const getSessionsFromDate = (date: Date, sessions: flight_sessions[]): flight_sessions[] => {
    return sessions?.filter((session) => {
        const sessionDate = session.sessionDateStart;

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
        const diff = (day === 0 ? -6 : 1) - day; // Monday as the first day
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

    // Loop while the current Monday is in the month or the week includes days of the month
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
        weeks.push(week);
        currentMonday = addDays(currentMonday, 7);
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

// Decimal hour -> "HH:MM" (8.5 -> "08:30", 8.25 -> "08:15").
// The decimal part is a fraction of an hour, not minutes.
export const formatTime = (numberValue: number) => {
    const totalMinutes = Math.round(numberValue * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const formatDate = (date: Date) => {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getUTCHours()}:${date.getUTCMinutes() === 0 ? '00' : date.getUTCMinutes()}`;
};