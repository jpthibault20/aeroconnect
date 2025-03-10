import React, { useEffect, useState } from 'react';
import SessionPopup from '../SessionPopup';
import { flight_sessions, planes, User } from '@prisma/client';
import { Clock, Plane } from 'lucide-react';
import { LiaChalkboardTeacherSolid } from 'react-icons/lia';
import { useCurrentUser } from '@/app/context/useCurrentUser';

interface Props {
    sessions: flight_sessions[];
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    usersProps: User[]
    planesProp: planes[]
}

const Session = ({ sessions, setSessions, usersProps, planesProp }: Props) => {
    const [planesString, setPlanesString] = useState("");
    const [instructorString, setInstructorString] = useState("");
    const { currentUser } = useCurrentUser()
    const filterdPlanes = planesProp.filter((p) => currentUser?.classes.includes(p.classes))


    // Sépare les sessions réservées et disponibles
    const availableSessions = sessions.filter(session => session.studentID === null);
    const bookedSessions = sessions.filter(session => session.studentID !== null);

    const availablePlanes = new Set<string>();
    const availablePilots = new Set<string>();

    availableSessions.forEach(session => {
        session.planeID.forEach((plane) => {
            const foundPlane = filterdPlanes.find(p => p.id === plane);
            if (foundPlane) {
                availablePlanes.add(foundPlane.id);
            } else if (plane === "classroomSession") {
                availablePlanes.add("classroomSession");
            }
        }); availablePilots.add(session.pilotFirstName);
    });

    const noSessions = availableSessions.length === 0 ? true : false;

    const endSessionDate = new Date(
        sessions[0].sessionDateStart.getFullYear(),
        sessions[0].sessionDateStart.getMonth(),
        sessions[0].sessionDateStart.getDate(),
        sessions[0].sessionDateStart.getHours(),
        sessions[0].sessionDateStart.getMinutes() + sessions[0].sessionDateDuration_min,
        0
    );

    // regroupe for planes
    useEffect(() => {
        const allPlanes = [
            ...new Set([...availableSessions].flatMap(session => session.planeID))
        ];

        if (allPlanes.length === 1) {
            setPlanesString(allPlanes[0] === "classroomSession" ? "Théorique" : filterdPlanes.find(p => p.id === allPlanes[0])?.name as string)
        }
        else if (allPlanes.length > 1) {
            const planes = filterdPlanes
            let planesNumber = planes.filter((p) => allPlanes.includes(p.id)).length
            if (allPlanes.includes("classroomSession"))
                planesNumber++;

            setPlanesString(planesNumber + " avions");
        }
        else {
            setPlanesString("0 avion");
        }
    }, [availableSessions, bookedSessions, filterdPlanes])

    // regroupe for instructor
    useEffect(() => {

        if (availableSessions.length === 0) {
            setInstructorString("0 instructeur");
        } else if (availableSessions.length === 1) {
            setInstructorString(availableSessions[0].pilotLastName.slice(0, 1).toUpperCase() + "." + availableSessions[0].pilotFirstName)
        } else {
            setInstructorString(availableSessions.length + " Instructeurs")
        }
    }, [availableSessions, bookedSessions])

    if ([...bookedSessions, ...availableSessions].length === 0) return null;

    return (
        <SessionPopup sessions={[...bookedSessions, ...availableSessions]} noSessions={noSessions} setSessions={setSessions} usersProps={usersProps} planesProp={planesProp}>
            <div className={`rounded-md p-1 shadow-sm  ${noSessions ? "bg-purple-100 opacity-50" : "bg-green-200"}`}>
                <div className='flex w-full items-center justify-end'>
                    <Clock className="w-4 h-4 mr-1" />
                    <span className='text-xs'>
                        {sessions[0].sessionDateStart.getUTCHours().toString().padStart(2, '0')}:
                        {sessions[0].sessionDateStart.getUTCMinutes().toString().padStart(2, '0')} -
                        {endSessionDate.getUTCHours().toString().padStart(2, '0')}:
                        {endSessionDate.getUTCMinutes().toString().padStart(2, '0')}
                    </span>
                </div>

                <div className='flex items-center '>
                    <Plane className="w-4 h-4 mr-1" />
                    <span className='text-xs'>
                        {planesString}
                    </span>
                </div>

                <div className='flex items-center'>
                    <LiaChalkboardTeacherSolid className='w-4 h-4 mr-1' />
                    <span className='text-xs'>
                        {instructorString}
                    </span>
                </div>
            </div>
        </SessionPopup>
    )
};

export default Session;
