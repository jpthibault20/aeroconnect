import { Clock, Plane, User, GraduationCap } from 'lucide-react'
import { cn, getPlaneName } from "@/lib/utils"
import { flight_sessions, planes, User as PrismaUser } from '@prisma/client'
import SessionPopup from '@/components/SessionPopup'
import { useEffect, useState } from 'react'
import { useCurrentUser } from '@/app/context/useCurrentUser'

interface SessionProps {
    PlaneProps: planes[]
    session: flight_sessions
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    userProps: PrismaUser[]
}

export function Session({ session, setSessions, PlaneProps, userProps }: SessionProps) {
    const [planesString, setPlanesString] = useState("");
    const { currentUser } = useCurrentUser()
    const filterdPlanes = PlaneProps.filter((p) => currentUser?.classes.includes(p.classes))

    useEffect(() => {
        if (session.studentPlaneID) {
            setPlanesString(getPlaneName(session.studentPlaneID, PlaneProps).name as string);
        }
        else if (session.planeID.length === 1) {
            setPlanesString(getPlaneName(session.planeID[0], PlaneProps).name as string);
        }
        else {
            const planes = filterdPlanes
            let planesNumber = planes.filter((p) => session.planeID.includes(p.id)).length;
            if (session.planeID.includes("classroomSession"))
                planesNumber++;

            setPlanesString(planesNumber + " avions");
        }
    }, [PlaneProps, filterdPlanes, session.planeID, session.studentPlaneID])

    const endSessionDate = new Date(
        session.sessionDateStart.getFullYear(),
        session.sessionDateStart.getMonth(),
        session.sessionDateStart.getDate(),
        session.sessionDateStart.getHours(),
        session.sessionDateStart.getMinutes() + session.sessionDateDuration_min,
        0
    );

    const isBooked = !!session.studentID;
    const noteCount = (session.pilotComment ? 1 : 0) + (session.studentComment ? 1 : 0);

    // Formatage compact de l'heure
    const formatTime = (date: Date) => {
        return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
    };

    return (
        <SessionPopup
            sessions={[session]}
            setSessions={setSessions}
            noSessions={isBooked}
            usersProps={userProps}
            planesProp={PlaneProps}
        >
            <div className={cn(
                "relative flex items-center justify-between w-full px-3 py-2.5 rounded-lg border shadow-sm transition-all active:scale-[0.99]",
                // BARRE GAUCHE EPAISSE
                "border-l-[6px]",
                // LOGIQUE COULEUR :
                // Disponible : Bordure Violette partout + Barre gauche Violette + fond blanc
                // Réservé : Bordure fine grise + Barre gauche grise plus foncée + fond grisé
                !isBooked
                    ? "bg-white border-[#774BBE] border-l-[#774BBE] shadow-purple-50"
                    : "bg-slate-50 border-slate-200 border-l-slate-300 text-slate-500"
            )}>

                {/* GAUCHE : Heure & Avion */}
                <div className="flex flex-col gap-1 items-start">
                    {/* Heure */}
                    <div className="flex items-center gap-1.5">
                        <Clock className={cn("w-3.5 h-3.5", !isBooked ? "text-[#774BBE]" : "text-slate-400")} />
                        <span className={cn(
                            "text-sm font-bold leading-none tracking-tight",
                            !isBooked ? "text-slate-800" : "text-slate-500"
                        )}>
                            {formatTime(session.sessionDateStart)} - {formatTime(endSessionDate)}
                        </span>
                    </div>

                    {/* Avion */}
                    <div className="flex items-center gap-1.5 pl-0.5">
                        <Plane className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-[11px] font-medium text-slate-500 truncate max-w-[120px]">
                            {planesString}
                        </span>
                    </div>
                </div>

                {/* DROITE : Personnes / Statut */}
                <div className="flex flex-col items-end gap-1.5">

                    {/* Instructeur */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-600">
                            {session.pilotLastName.toUpperCase().slice(0, 1)}.{session.pilotFirstName}
                        </span>
                        <User size={12} className="text-slate-400" />
                    </div>

                    {/* Élève ou Badge Dispo */}
                    {isBooked ? (
                        <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-slate-200/50">
                            <span className="text-[10px] font-bold text-slate-600 truncate max-w-[80px]">
                                {session.studentLastName?.toUpperCase().slice(0, 1)}.{session.studentFirstName}
                            </span>
                            <GraduationCap size={11} className="text-slate-500" />
                        </div>
                    ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#774BBE] bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                            Dispo
                        </span>
                    )}
                </div>

                {/* Indicateur de note discret (Point violet) */}
                {noteCount > 0 && (
                    <div className="absolute top-1 right-1">
                        <div className="flex items-center justify-center w-3 h-3 rounded-full bg-[#774BBE] ring-2 ring-white">
                            <span className="sr-only">Notes</span>
                        </div>
                    </div>
                )}
            </div>
        </SessionPopup>
    )
}