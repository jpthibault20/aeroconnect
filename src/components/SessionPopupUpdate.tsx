import { flight_sessions, planes, User, userRole } from '@prisma/client'
import React from 'react'
import { MessageSquareMore, Plane } from 'lucide-react'
import { PiStudent } from 'react-icons/pi'
import { LiaChalkboardTeacherSolid } from 'react-icons/lia'
import { useCurrentUser } from '@/app/context/useCurrentUser'
import { MdDeleteForever } from "react-icons/md";
import AddStudent from './flights/AddStudent'
import RemoveStudent from './RemoveStudent'
import DeleteFlightSession from './DeleteFlightSession'
import ShowCommentSession from './ShowCommentSession'

interface Prop {
    sessions: flight_sessions[]
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>
    usersProps: User[]
    planesProp: planes[]
}

const SessionPopupUpdate = ({ sessions, setSessions, usersProps, planesProp }: Prop) => {
    const { currentUser } = useCurrentUser()


    return (
        <div>
            <div className={`grid gap-2 ${sessions.length === 1
                ? "grid-cols-1 justify-center items-center"
                : sessions.length === 2
                    ? "grid-cols-2 justify-center items-center"
                    : "grid-cols-3 justify-center items-center"
                }`}>
                {sessions.map((s, index) => (
                    <div
                        key={index}
                        className="flex flex-rows items-start justify-between border rounded-md p-4 text-center"
                    >

                        <div>
                            {/* Pilote */}
                            <div className="flex items-center space-x-2">
                                <LiaChalkboardTeacherSolid />
                                <p>
                                    {s.pilotLastName.slice(0, 1).toUpperCase() +
                                        "." +
                                        s.pilotFirstName}
                                </p>
                            </div>

                            {/* Étudiant */}
                            <div className="flex items-center space-x-2">
                                <PiStudent />
                                <p>
                                    {s.studentID ? (
                                        s.studentLastName?.slice(0, 1).toUpperCase()
                                        + "." +
                                        s.studentFirstName
                                    ) : (
                                        "..."
                                    )}
                                </p>
                            </div>

                            {/* Avion */}
                            <div className="flex items-center space-x-2">
                                <Plane className="w-4 h-4" />
                                <p>
                                    {s.studentPlaneID === "classroomSession"
                                        ? "Théorique"
                                        : s.studentID ? planesProp.find((plane) => plane.id === s.studentPlaneID)?.name : "..."}
                                </p>
                            </div>

                            {/* Commment */}
                            <ShowCommentSession
                                session={s}
                                setSessions={setSessions}
                            >
                                <div className='flex items-center space-x-2'>
                                    <MessageSquareMore className='w-4 h-4' />
                                    <p>
                                        {(s.pilotComment && s.studentComment) ? "2 notes" :
                                            (s.pilotComment || s.studentComment) ? "1 note" :
                                                "0 note"
                                        }
                                    </p>
                                </div>
                            </ShowCommentSession>
                        </div>

                        {(currentUser?.role === userRole.ADMIN ||
                            currentUser?.role === userRole.OWNER ||
                            currentUser?.id === s.pilotID) && (
                                <div className="flex flex-col space-y-2">
                                    <DeleteFlightSession
                                        description={`Ce vol sera supprimé définitivement`}
                                        sessions={sessions} setSessions={setSessions}
                                        usersProp={usersProps}
                                    >
                                        <MdDeleteForever color="red" size={15} />
                                    </DeleteFlightSession>
                                    {s.studentID ? (
                                        <RemoveStudent
                                            session={s}
                                            setSessions={setSessions}
                                            usersProp={usersProps}
                                        />
                                    ) : (
                                        <AddStudent
                                            session={s}
                                            sessions={sessions}
                                            setSessions={setSessions}
                                            planesProp={planesProp}
                                            usersProp={usersProps}
                                        />
                                    )}
                                </div>
                            )}

                    </div>
                ))}
            </div>
        </div>
    )
}

export default SessionPopupUpdate
