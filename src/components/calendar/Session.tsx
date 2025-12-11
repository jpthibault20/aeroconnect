'use client'

import React, { useMemo } from 'react';
import SessionPopup from '../SessionPopup';
import { flight_sessions, planes, User } from '@prisma/client';
import { Clock, Plane, User as UserIcon, Users } from 'lucide-react';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { cn } from '@/lib/utils';

interface Props {
    sessions: flight_sessions[];
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    usersProps: User[]
    planesProp: planes[]
}

const Session = ({ sessions, setSessions, usersProps, planesProp }: Props) => {
    const { currentUser } = useCurrentUser()

    // --- 1. Logique (Memoïsée) ---

    const allowedPlanes = useMemo(() => {
        return planesProp.filter((p) => currentUser?.classes.includes(p.classes))
    }, [planesProp, currentUser?.classes]);

    const { availableSessions, bookedSessions, isFullyBooked } = useMemo(() => {
        const available = sessions.filter(session => session.studentID === null);
        const booked = sessions.filter(session => session.studentID !== null);
        return {
            availableSessions: available,
            bookedSessions: booked,
            isFullyBooked: available.length === 0
        }
    }, [sessions]);

    const firstSession = sessions[0];

    const timeString = useMemo(() => {
        if (!firstSession) return "";
        const start = firstSession.sessionDateStart;
        const endTimestamp = new Date(start).getTime() + firstSession.sessionDateDuration_min * 60000;
        const endDate = new Date(endTimestamp);
        const format = (h: number, m: number) =>
            `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        return `${format(start.getUTCHours(), start.getUTCMinutes())} - ${format(endDate.getUTCHours(), endDate.getUTCMinutes())}`;
    }, [firstSession]);

    const planesString = useMemo(() => {
        const uniquePlaneIds = Array.from(new Set(availableSessions.flatMap(s => s.planeID)));
        if (isFullyBooked) return "Complet";
        if (uniquePlaneIds.length === 0) return "Aucun appareil";

        if (uniquePlaneIds.length === 1) {
            const pid = uniquePlaneIds[0];
            if (pid === "classroomSession") return "Théorique";
            const plane = allowedPlanes.find(p => p.id === pid);
            return plane ? plane.name : "Avion indisponible";
        }

        let count = 0;
        uniquePlaneIds.forEach(pid => {
            if (pid === "classroomSession") count++;
            else if (allowedPlanes.some(p => p.id === pid)) count++;
        });

        return count > 1 ? `${count} avions` : (count === 1 ? "1 avion" : "Non éligible");
    }, [availableSessions, allowedPlanes, isFullyBooked]);

    const instructorString = useMemo(() => {
        if (isFullyBooked) return bookedSessions.length > 0 ? "Réservé" : "Indisponible";
        if (availableSessions.length === 1) {
            const s = availableSessions[0];
            return `${s.pilotLastName.slice(0, 1).toUpperCase()}.${s.pilotFirstName}`;
        }
        return `${availableSessions.length} instructeurs`;
    }, [availableSessions, isFullyBooked, bookedSessions.length]);

    if (sessions.length === 0) return null;

    // --- 2. Design Desktop Pro ---
    return (
        <SessionPopup
            sessions={[...bookedSessions, ...availableSessions]}
            noSessions={isFullyBooked}
            setSessions={setSessions}
            usersProps={usersProps}
            planesProp={planesProp}
        >
            <div
                className={cn(
                    "group relative flex flex-col gap-1 rounded-lg p-2 text-xs transition-all duration-200 h-full overflow-hidden select-none border",

                    isFullyBooked
                        // ÉTAT COMPLET : 
                        // Fond gris-violet très clair qui se fond un peu avec le calendrier mais reste distinct.
                        // Pas d'ombre (flat) pour montrer qu'il n'est pas "actif".
                        // Opacité réduite pour ne pas attirer l'attention.
                        ? "bg-slate-100/80 border-slate-200 text-slate-500 cursor-default"

                        // ÉTAT DISPONIBLE : 
                        // Fond BLANC PUR pour trancher avec le gris du calendrier.
                        // Ombre portée pour donner du relief (effet carte).
                        // Bordure gauche Violette (#774BBE) marqueur de la charte.
                        // AJOUT : border-slate-200 remplace border-transparent pour une fine bordure tout autour
                        : "bg-white border-[#9a82c0] border-l-[4px] border-l-[#774BBE] shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                )}
            >
                {/* Ligne Horaire */}
                <div className={cn(
                    "flex items-center font-bold mb-0.5",
                    isFullyBooked ? "text-slate-500" : "text-[#774BBE]"
                )}>
                    <Clock className={cn("w-3.5 h-3.5 mr-2 flex-shrink-0", isFullyBooked ? "opacity-50" : "")} />
                    <span className="truncate tracking-tight">{timeString}</span>
                </div>

                {/* Info Avion */}
                <div className={cn(
                    "flex items-center gap-2 truncate",
                    isFullyBooked ? "text-slate-400" : "text-slate-700 font-medium"
                )}>
                    <Plane className={cn("w-3.5 h-3.5 flex-shrink-0", isFullyBooked ? "opacity-50" : "text-[#774BBE]/70")} />
                    <span className="truncate">{planesString}</span>
                </div>

                {/* Info Instructeur */}
                <div className={cn(
                    "flex items-center gap-2 truncate",
                    isFullyBooked ? "text-slate-400" : "text-slate-500"
                )}>
                    {availableSessions.length > 1 ? (
                        <Users className={cn("w-3.5 h-3.5 flex-shrink-0", isFullyBooked ? "opacity-50" : "text-slate-400")} />
                    ) : (
                        <UserIcon className={cn("w-3.5 h-3.5 flex-shrink-0", isFullyBooked ? "opacity-50" : "text-slate-400")} />
                    )}
                    <span className="truncate">{instructorString}</span>
                </div>
            </div>
        </SessionPopup>
    );
};

export default Session;