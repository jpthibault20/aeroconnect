import { Clock, Plane } from 'lucide-react'
import { cn } from "@/lib/utils"
import { flight_sessions, planes, User } from '@prisma/client'
import SessionPopup from '@/components/SessionPopup'
import { useEffect, useState } from 'react'
import { getPlaneName } from '@/api/db/planes'
import { LiaChalkboardTeacherSolid } from "react-icons/lia";
import { PiStudent } from "react-icons/pi";



interface SessionProps {
    PlaneProps: planes[]
    session: flight_sessions
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    userProps: User[]
}

export function Session({ session, setSessions, PlaneProps, userProps }: SessionProps) {
    const [planesString, setPlanesString] = useState("");

    useEffect(() => {
        if (session.studentPlaneID) {
            getPlaneName(session.studentPlaneID).then(res => {
                if (res && 'name' in res) {
                    setPlanesString(res.name as string);
                }
            })
        }
        else if (session.planeID.length === 1) {
            getPlaneName(session.planeID[0]).then(res => {
                if (res && 'name' in res) {
                    setPlanesString(res.name as string);
                }
            })
        }
        else {
            const planes = session.planeID.includes("classromSession") ? 1 : (session.planeID.filter(planeID => PlaneProps.find(p => p.id === planeID)?.id).length);
            setPlanesString(planes + " avions");
        }
    }, [PlaneProps, session.planeID, session.studentPlaneID])

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
                        <span className="text-lg font-medium">Complet</span>
                        <div className='flex justify-center items-center space-x-1'>
                            <PiStudent />
                            <span>{session.studentLastName?.toUpperCase().slice(0, 1)}.{session.studentFirstName}</span>
                        </div>
                    </div>
                )}

                <div className='flex items-start justify-end'>
                    <div className='flex justify-center items-center space-x-1'>
                        <LiaChalkboardTeacherSolid />
                        <span className="text-sm">{session.pilotLastName.toUpperCase().slice(0, 1)}.{session.pilotFirstName}</span>
                    </div>
                </div>
            </div>
        </SessionPopup>
    )
}
