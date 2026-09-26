import { Clock, Plane, User, GraduationCap } from 'lucide-react'
import { cn, getPlaneName } from "@/lib/utils"
import { BAPTEME_HOLD_STUDENT_ID } from "@/lib/bapteme"
import { flight_sessions, planes, User as PrismaUser } from '@prisma/client'
import SessionPopup from '@/components/SessionPopup'
import { useCurrentUser } from '@/app/context/useCurrentUser'
import { formatSessionTime } from '@/api/global function/dateServeur'

interface SessionProps {
    PlaneProps: planes[]
    session: flight_sessions
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    userProps: PrismaUser[]
}

export function Session({ session, setSessions, PlaneProps, userProps }: SessionProps) {
    const { currentUser } = useCurrentUser()
    const filterdPlanes = PlaneProps.filter((p) => currentUser?.classes.includes(p.classes))

    // Plane label: the booked one, the single offered one, or the number offered.
    const getPlanesString = () => {
        if (session.studentPlaneID) {
            return getPlaneName(session.studentPlaneID, PlaneProps).name as string;
        }
        if (session.planeID.length === 1) {
            return getPlaneName(session.planeID[0], PlaneProps).name as string;
        }
        let planesNumber = filterdPlanes.filter((p) => session.planeID.includes(p.id)).length;
        if (session.planeID.includes("classroomSession"))
            planesNumber++;
        return planesNumber + " avions";
    };
    const planesString = getPlanesString();

    const endSessionDate = new Date(
        session.sessionDateStart.getFullYear(),
        session.sessionDateStart.getMonth(),
        session.sessionDateStart.getDate(),
        session.sessionDateStart.getHours(),
        session.sessionDateStart.getMinutes() + session.sessionDateDuration_min,
        0
    );

    const isBooked = !!session.studentID;
    const isHold = session.studentID === BAPTEME_HOLD_STUDENT_ID;
    const noteCount = (session.pilotComment ? 1 : 0) + (session.studentComment ? 1 : 0);

    const formatTime = formatSessionTime;

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
                "border-l-[6px]",
                // Available: purple border all around + purple left bar + white background.
                // Booked: thin grey border + darker grey left bar + greyed background.
                !isBooked
                    ? "bg-white border-[#774BBE] border-l-[#774BBE] shadow-purple-50"
                    : isHold
                        ? "bg-amber-50 border-amber-200 border-l-amber-400 text-amber-700"
                        : "bg-slate-50 border-slate-200 border-l-slate-300 text-slate-500"
            )}>

                <div className="flex flex-col gap-1 items-start">
                    <div className="flex items-center gap-1.5">
                        <Clock className={cn("w-3.5 h-3.5", !isBooked ? "text-[#774BBE]" : "text-slate-400")} />
                        <span className={cn(
                            "text-sm font-bold leading-none tracking-tight",
                            !isBooked ? "text-slate-800" : "text-slate-500"
                        )}>
                            {formatTime(session.sessionDateStart)} - {formatTime(endSessionDate)}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 pl-0.5">
                        <Plane className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-[11px] font-medium text-slate-500 truncate max-w-[120px]">
                            {planesString}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">

                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-600">
                            {session.pilotLastName.toUpperCase().slice(0, 1)}.{session.pilotFirstName}
                        </span>
                        <User size={12} className="text-slate-400" />
                    </div>

                    {/* Student, discovery-flight hold, or "available" badge */}
                    {isHold ? (
                        <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-amber-100">
                            <span className="text-[10px] font-bold text-amber-700 truncate max-w-[110px]">
                                Baptême · en attente
                            </span>
                            <Clock size={11} className="text-amber-600" />
                        </div>
                    ) : isBooked ? (
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