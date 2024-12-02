import { Clock, Plane } from 'lucide-react'
import { cn } from "@/lib/utils"
import { flight_sessions } from '@prisma/client'

interface SessionProps {
    PlaneProps: number
    session: flight_sessions
}

export function Session({ PlaneProps, session }: SessionProps) {

    const endSessionDate = new Date(
        session.sessionDateStart.getFullYear(),
        session.sessionDateStart.getMonth(),
        session.sessionDateStart.getDate(),
        session.sessionDateStart.getHours(),
        session.sessionDateStart.getMinutes() + session.sessionDateDuration_min,
        0
    );

    return (
        <div className={cn(
            "p-2 rounded-md mb-3 gap-3",
            session.studentID ? "bg-gray-100 text-gray-500 grid grid-cols-3" : "bg-green-100 grid grid-cols-2"
        )}>
            <div className='flex flex-col items-start justify-center'>
                <span className='flex justify-center items-center'>
                    <Plane className="w-4 h-4 mr-1" />
                    {PlaneProps} Avions
                </span>
                <span className='flex justify-center items-center'>
                    <Clock className="w-4 h-4 mr-1" />
                    <span>
                        {session.sessionDateStart.getUTCHours().toString().padStart(2, '0')}:
                        {session.sessionDateStart.getUTCMinutes().toString().padStart(2, '0')} -
                        {endSessionDate.getUTCHours().toString().padStart(2, '0')}:
                        {endSessionDate.getUTCMinutes().toString().padStart(2, '0')}
                    </span>
                </span>
            </div>

            {session.studentID && (
                <div className='flex items-center justify-end'>
                    <span className="text-lg mt-1 font-medium">Complet</span>
                </div>
            )}

            <div className='flex items-start justify-end'>
                <span className="text-sm">{session.pilotLastName.toUpperCase().slice(0, 1)}.{session.pilotFirstName}</span>
            </div>
        </div>
    )
}
