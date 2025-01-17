/**
 * @file TableRowComponent.tsx
 * @brief A React component representing a single row in the flight sessions table.
 * 
 * This component displays information about a single flight session and provides functionality
 * for selecting the session, updating, and deleting it.
 * 
 * @param {Object} props - Component props.
 * @param {flight_sessions} props.session - The flight session object to display.
 * @param {React.Dispatch<React.SetStateAction<number[]>>} props.setSessionChecked - Function to set the IDs of checked sessions.
 * @param {boolean} props.isAllChecked - Indicates if the "select all" checkbox is checked.
 * 
 * @returns {JSX.Element} The rendered table row component.
 */

import React, { useState, useEffect } from 'react';
import { TableCell, TableRow } from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { flight_sessions, planes, User, userRole } from '@prisma/client';
import AddStudent from './AddStudent';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { FaArrowRight } from "react-icons/fa";
import SessionPopup from '../SessionPopup';
import RemoveStudent from '../RemoveStudent';
import DeleteFlightSession from '../DeleteFlightSession';


interface props {
    session: flight_sessions;  ///< The flight session object
    sessions: flight_sessions[];
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    setSessionChecked: React.Dispatch<React.SetStateAction<flight_sessions[]>>; ///< Function to update selected session IDs
    isAllChecked: boolean; ///< Indicates if "select all" is checked
    planesProp: planes[];
    usersProp: User[];
}

const TableRowComponent = ({ session, sessions, setSessions, setSessionChecked, isAllChecked, planesProp, usersProp }: props) => {
    const { currentUser } = useCurrentUser();
    const [isChecked, setIsChecked] = useState(false); // State for individual checkbox
    const [autorisedDeleteStudent, setAutorisedDeleteStudent] = useState(false);
    const [plane, setPlane] = useState<planes | undefined>();

    const finalDate = new Date(session.sessionDateStart);
    finalDate.setMinutes(finalDate.getMinutes() + session.sessionDateDuration_min); // Calculate end time of the session

    useEffect(() => {
        if (currentUser?.role === "ADMIN" || currentUser?.role === "OWNER" || currentUser?.role === "INSTRUCTOR" || session.studentID === currentUser?.id) {
            setAutorisedDeleteStudent(true);
        } else {
            setAutorisedDeleteStudent(false);
        }
    }, [currentUser, session.studentID]);

    // Sync individual checkbox state with "select all"
    useEffect(() => {
        if (session.studentPlaneID) {
            const classroomPlane = { id: "classroomSession", name: "session théorique", immatriculation: "classroomSession", operational: true, clubID: currentUser?.clubID as string };

            const foundPlane = planesProp.find((p) => p.id === session.studentPlaneID) || session.studentPlaneID === "classroomSession" && classroomPlane;
            setPlane(foundPlane as planes); // Met à jour l'état
        }

        setIsChecked(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    // Sync individual checkbox state with "select all"
    useEffect(() => {
        setIsChecked(isAllChecked);
    }, [isAllChecked]);

    // Handles individual checkbox change.
    const onChecked = (sessionId: string, checked: boolean) => {
        setIsChecked(checked);
        setSessionChecked((prev) => {
            if (checked) {
                const session = sessions.find(s => s.id === sessionId);
                if (session) {
                    return [...prev, session]; // Add session if checked and found
                }
                return prev; // No changes if session is not found
            } else {
                return prev.filter(s => s.id !== sessionId); // Remove session if unchecked
            }
        });
    };

    return (
        <TableRow className='font-istok'>
            <TableCell className='text-center'>
                <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => onChecked(session.id, !!checked)}
                />
            </TableCell>
            <TableCell className='text-center'>
                {session.sessionDateStart.toLocaleDateString('fr-FR', { day: 'numeric', month: '2-digit', year: 'numeric' })}
            </TableCell>
            <TableCell className='flex justify-center items-center gap-x-2'>
                {session.sessionDateStart.toISOString().slice(11, 16)}
                <FaArrowRight />
                {finalDate.toISOString().slice(11, 16)}
            </TableCell>
            <TableCell className="text-center">
                {session.planeID.length === 1 && session.planeID[0] === "classroomSession" ? (
                    "Théorique"
                ) : session.planeID.includes("classroomSession") ? (
                    "Pratique / Théorique"
                ) : (
                    "Pratique"
                )}
            </TableCell>

            <TableCell className='text-center'>
                {session.pilotLastName.slice(0, 1).toUpperCase()}.{session.pilotFirstName}
            </TableCell>
            <TableCell className='text-center'>
                {session.studentFirstName && session.studentLastName ? (
                    <div className='flex items-center justify-center space-x-1.5'>
                        <p>{session.studentLastName.slice(0, 1).toUpperCase()}.{session.studentFirstName}</p>
                        {autorisedDeleteStudent &&
                            <RemoveStudent
                                session={session}
                                setSessions={setSessions}
                                usersProp={usersProp}
                            />
                        }
                    </div>
                )
                    : currentUser?.role == userRole.ADMIN || currentUser?.role == userRole.INSTRUCTOR || currentUser?.role == userRole.OWNER ?
                        (
                            <AddStudent session={session} setSessions={setSessions} sessions={sessions} planesProp={planesProp} usersProp={usersProp} />
                        )
                        : currentUser?.role == userRole.PILOT || currentUser?.role == userRole.STUDENT ?
                            (
                                <SessionPopup sessions={[session]} setSessions={setSessions} usersProps={usersProp} planesProp={planesProp} noSessions={session.studentID ? true : false} >
                                    <div className='bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-lg'>
                                        S&apos;inscrire
                                    </div>
                                </SessionPopup>
                            )
                            : null
                }
            </TableCell>
            <TableCell className='text-center'>
                {plane?.name || '...'}
            </TableCell>
            <TableCell className='h-full w-full justify-center items-center flex'>
                {currentUser?.role == userRole.ADMIN || currentUser?.role == userRole.INSTRUCTOR || currentUser?.role == userRole.OWNER ?
                    (

                        <DeleteFlightSession description={`Ce vol sera supprimé définitivement`} sessions={[session]} setSessions={setSessions} usersProp={usersProp}>
                            <div className='px-2 py-1 bg-red-600 text-white rounded-lg'>
                                Supprimer
                            </div>
                        </DeleteFlightSession>
                    ) : null
                }
            </TableCell>
        </TableRow>
    );
};

export default TableRowComponent;
