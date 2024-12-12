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
import { IoMdClose } from 'react-icons/io';
import AlertConfirmDeleted from '../AlertConfirmDeleted';
import { removeSessionsByID, removeStudentFromSessionID } from '@/api/db/sessions';
import { toast } from '@/hooks/use-toast';
import AddStudent from './AddStudent';
import { Button } from '../ui/button';
import { useCurrentUser } from '@/app/context/useCurrentUser';


interface props {
    session: flight_sessions;  ///< The flight session object
    sessions: flight_sessions[];
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    setSessionChecked: React.Dispatch<React.SetStateAction<string[]>>; ///< Function to update selected session IDs
    isAllChecked: boolean; ///< Indicates if "select all" is checked
    planesProp: planes[];
    usersProp: User[]
}

const TableRowComponent = ({ session, sessions, setSessions, setSessionChecked, isAllChecked, planesProp, usersProp }: props) => {
    const { currentUser } = useCurrentUser();
    const [isChecked, setIsChecked] = useState(false); // State for individual checkbox
    const [loading, setLoading] = useState(false);
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
            const foundPlane = planesProp.find((p) => p.id === session.studentPlaneID);
            setPlane(foundPlane); // Met à jour l'état
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
                return [...prev, sessionId]; // Add session ID if checked
            } else {
                return prev.filter(id => id !== sessionId); // Remove session ID if unchecked
            }
        });
    };

    // Remove flights from session
    const removeFlight = (sessions: string[]) => {
        const removeSessions = async () => {
            if (sessions.length > 0) {
                setLoading(true);
                try {
                    const res = await removeSessionsByID(sessions);
                    if (res.error) {
                        toast({
                            title: "Oups, une erreur est survenue",
                            description: res.error,
                        });
                    }
                    if (res.success) {
                        toast({
                            title: res.success,
                        });

                        //supprimer les sessions de la base de données local
                        setSessions(prevSessions => {
                            const updatedSessions = prevSessions.filter(session => !sessions.includes(session.id));
                            return updatedSessions;
                        });
                    }
                } catch (error) {
                    console.log(error);
                } finally {
                    setLoading(false);
                }
            }
        };

        removeSessions();
    }

    const removeStudent = (sessionID: string | null) => {
        const removeSessions = async () => {
            if (sessionID) {
                setLoading(true);
                try {
                    // Suppression de l'étudiant de la session
                    const res = await removeStudentFromSessionID(sessionID);
                    if (res.success) {
                        toast({
                            title: res.success,
                        });

                        // Mise à jour de la session pour nettoyer les valeurs
                        setSessions(prevSessions => {
                            const updatedSessions = prevSessions.map(s =>
                                s.id === sessionID
                                    ? {
                                        ...s,
                                        studentID: null,             // Réinitialisation de l'ID étudiant
                                        studentFirstName: "",        // Réinitialisation du prénom
                                        studentLastName: "",         // Réinitialisation du nom
                                        studentPlaneID: null,        // Réinitialisation de l'ID de l'avion
                                    }
                                    : s
                            );
                            return updatedSessions;
                        });
                        setPlane(undefined)
                        setLoading(false);
                    }

                    if (res.error) {
                        toast({
                            title: "Oups, une erreur est survenue",
                            description: res.error,
                        });

                    }
                } catch (error) {
                    console.log(error);
                }
            }
        };

        removeSessions();
        // setLoading(false);
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
            <TableCell className='text-center'>
                {session.sessionDateStart.toISOString().slice(11, 16)}
            </TableCell>
            <TableCell className='text-center'>
                {finalDate.toISOString().slice(11, 16)}
            </TableCell>
            <TableCell className='text-center'>
                {session.finalReccurence !== null ? (session.finalReccurence.toLocaleDateString('fr-FR', { day: 'numeric', month: '2-digit', year: 'numeric' })) : 'NON'}
            </TableCell>
            <TableCell className='text-center'>
                {session.pilotLastName.slice(0, 1).toUpperCase()}.{session.pilotFirstName}
            </TableCell>
            <TableCell className='text-center'>
                {session.studentFirstName && session.studentLastName ? (
                    <div className='flex items-center justify-center space-x-1.5'>
                        <p>{session.studentLastName.slice(0, 1).toUpperCase()}.{session.studentFirstName}</p>
                        {autorisedDeleteStudent &&
                            <AlertConfirmDeleted
                                title="Etes vous sur de vouloir Désinscrire l'élève ?"
                                description={`vous allez désinscrire ${session.studentFirstName} ${session.studentLastName} de ce vol.`}
                                cancel='Annuler'
                                confirm='Supprimer'
                                confirmAction={() => removeStudent(session.id)}
                                loading={loading}
                            >
                                <button>
                                    <IoMdClose color='red' size={20} />
                                </button>
                            </AlertConfirmDeleted>
                        }
                    </div>
                ) : (
                    <AddStudent session={session} setSessions={setSessions} sessions={sessions} planesProp={planesProp} usersProp={usersProp} />
                )}
            </TableCell>
            <TableCell className='text-center'>
                {plane?.name || '...'}
            </TableCell>
            <TableCell className='h-full w-full justify-center items-center flex'>
                {currentUser?.role == userRole.ADMIN || currentUser?.role == userRole.INSTRUCTOR || currentUser?.role == userRole.OWNER ?
                    (
                        <AlertConfirmDeleted
                            title='Etes vous sur de vouloir supprimer ce vol ?'
                            description={'Ce vol sera supprimé définitivement'}
                            style='flex h-full w-full justify-center items-center'
                            cancel='Annuler'
                            confirm='Supprimer'
                            confirmAction={() => removeFlight([session.id])}
                            loading={loading}
                        >
                            <Button className='w-fit' variant={"destructive"} >Supprimer</Button>
                        </AlertConfirmDeleted>
                    ) : null
                }
            </TableCell>
        </TableRow>
    );
};

export default TableRowComponent;
