import { getDaysOfWeek, getSessionsFromDate } from '@/api/date';
import { flight_sessions } from '@prisma/client';
import React, { useMemo } from 'react';
import AvailableSession from './AvailableSession';
import BookedSession from './BookedSession';

interface Props {
    indexX: number;
    indexY: number;
    tabDays: string[];
    tabHours: number[];
    events: flight_sessions[];
    date: Date;
}

const Session = ({ indexX, indexY, tabHours = [], events = [], date }: Props) => {
    // Récupère les jours de la semaine
    const daysOfWeek = getDaysOfWeek(date);

    // Sécurisation de l'accès aux éléments de `tabHours`
    const hour = tabHours[indexX] !== undefined ? Math.floor(tabHours[indexX]) : 0;
    const minutes = tabHours[indexX] !== undefined ? Math.round((tabHours[indexX] % 1) * 60) : 0;

    const sessionDate = useMemo(() => {
        return new Date(
            date.getFullYear(),
            daysOfWeek[indexY]?.month ?? 0,
            daysOfWeek[indexY]?.dayNumber ?? 1,
            hour,
            minutes,
            0
        );
    }, [date, daysOfWeek, indexY, hour, minutes]); // Dépendances pour recalculer `sessionDate`


    const { availableSessions, bookedSessions, availablePlanes, availablePilots } = useMemo(() => {
        const matchingSessions = getSessionsFromDate(sessionDate, events);
        const availableSessions = matchingSessions.filter(session => session.studentID === null);
        const bookedSessions = matchingSessions.filter(session => session.studentID !== null);

        const availablePlanes = new Set<string>();
        const availablePilots = new Set<string>();

        availableSessions.forEach(session => {
            session.planeID.forEach(plane => availablePlanes.add(plane));
            availablePilots.add(session.pilotFirstName);
        });

        return {
            availableSessions,
            bookedSessions,
            availablePlanes: Array.from(availablePlanes),
            availablePilots: Array.from(availablePilots),
        };
    }, [events, sessionDate]); // `sessionDate` est maintenant stable


    // Si aucune session à afficher, on ne rend rien
    if (availableSessions.length === 0 && bookedSessions.length === 0) return null;

    return (
        <div className={`justify-center items-center p-1 rounded-md h-full w-full ${availableSessions.length === 0 ? 'bg-[#CB8A8A] opacity-50' : 'bg-[#B9DFC1]'}`}>
            <div>
                <p className="text-xs text-[#646464] text-end">
                    {sessionDate.getUTCHours().toString().padStart(2, '0')}:
                    {sessionDate.getUTCMinutes().toString().padStart(2, '0')} -
                    {(sessionDate.getUTCHours() + 1).toString().padStart(2, '0')}:
                    {sessionDate.getUTCMinutes().toString().padStart(2, '0')}
                </p>
            </div>
            {availableSessions.length > 0 && (
                <AvailableSession availablePlanes={availablePlanes} availablePilots={availablePilots} />
            )}
            {bookedSessions.length > 0 && (
                <BookedSession sessions={bookedSessions} />
            )}
        </div>
    );
};

export default Session;
