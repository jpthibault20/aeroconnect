import { Clock, MessageSquareMore, Plane } from 'lucide-react'
import { cn, getPlaneName } from "@/lib/utils"
import { flight_sessions, planes, User } from '@prisma/client'
import SessionPopup from '@/components/SessionPopup'
import { useEffect, useState } from 'react'
import { LiaChalkboardTeacherSolid } from "react-icons/lia";
import { PiStudent } from "react-icons/pi";
import { useCurrentUser } from '@/app/context/useCurrentUser'



interface SessionProps {
    PlaneProps: planes[]
    session: flight_sessions
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    userProps: User[]
}

export function Session({ session, setSessions, PlaneProps, userProps }: SessionProps) {
    const [planesString, setPlanesString] = useState("");
    const { currentUser } = useCurrentUser()
    const filterdPlanes = PlaneProps.filter((p) => currentUser?.classes.includes(p.classes))


    useEffect(() => {
        if (session.studentPlaneID) {
            setPlanesString(getPlaneName(session.studentPlaneID,PlaneProps).name as string);
        }
        else if (session.planeID.length === 1) {
            setPlanesString(getPlaneName(session.planeID[0],PlaneProps).name as string);
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

    return (
        <SessionPopup sessions={[session]} setSessions={setSessions} noSessions={session.studentID ? true : false} usersProps={userProps} planesProp={PlaneProps}>
            <div className={cn(
                "p-2 rounded-md mb-3 gap-3 shadow-sm",
                session.studentID ? "bg-purple-100 text-gray-500 grid grid-cols-3" : "bg-[#d8fde5] grid grid-cols-2"
            )}>
                <div className='flex flex-col items-start justify-center'>
                    <span className='flex justify-center items-center'>
                        <Plane className="w-4 h-4 mr-1" />
                        {planesString}
                    </span>
                    <span className='flex justify-center items-center'>
                        <Clock className="w-4 h-4 mr-1" />
                        <span className='text-xs'>
                            {session.sessionDateStart.getUTCHours().toString().padStart(2, '0')}:
                            {session.sessionDateStart.getUTCMinutes().toString().padStart(2, '0')} -
                            {endSessionDate.getUTCHours().toString().padStart(2, '0')}:
                            {endSessionDate.getUTCMinutes().toString().padStart(2, '0')}
                        </span>
                    </span>
                </div>

                {session.studentID && (
                    <div className='flex flex-col items-center justify-center'>
                        {/* <span className="text-lg font-medium">Complet</span> */}
                        <div className='flex justify-center items-center space-x-1'>
                            <PiStudent />
                            <span>{session.studentLastName?.toUpperCase().slice(0, 1)}.{session.studentFirstName}</span>
                        </div>
                    </div>
                )}

                <div className='flex-row items-start justify-end'>
                    <div className='flex justify-start items-center space-x-1'>
                        <LiaChalkboardTeacherSolid />
                        <span className="text-sm">{session.pilotLastName.toUpperCase().slice(0, 1)}.{session.pilotFirstName}</span>
                    </div>
                    <div className='flex justify-start items-center space-x-1'>
                        <MessageSquareMore className='w-3 h-3' />
                        <span className="text-sm">
                            {(session.pilotComment && session.studentComment) ? "2 notes" :
                                (session.pilotComment || session.studentComment) ? "1 note" :
                                    "0 note"
                            }
                        </span>
                    </div>
                </div>
            </div>
        </SessionPopup>
    )
}
