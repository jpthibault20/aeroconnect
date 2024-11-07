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
import { flight_sessions } from '@prisma/client';
import { IoMdClose } from 'react-icons/io';
import AlertConfirmDeleted from '../AlertConfirmDeleted';
import { removeSessionsByID, removeStudentFromSessionID } from '@/api/db/sessions';
import { toast } from '@/hooks/use-toast';
import AddStudent from './AddStudent';
import { Button } from '../ui/button';


interface props {
    session: flight_sessions;  ///< The flight session object
    setSessionChecked: React.Dispatch<React.SetStateAction<string[]>>; ///< Function to update selected session IDs
    isAllChecked: boolean; ///< Indicates if "select all" is checked
    reload: boolean;
    setReload: React.Dispatch<React.SetStateAction<boolean>>;
}

const TableRowComponent = ({ session, setSessionChecked, isAllChecked, reload, setReload }: props) => {
    const [isChecked, setIsChecked] = useState(false); // State for individual checkbox
    const [loading, setLoading] = useState(false);

    const finalDate = new Date(session.sessionDateStart);
    finalDate.setMinutes(finalDate.getMinutes() + session.sessionDateDuration_min); // Calculate end time of the session

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

    // Sync individual checkbox state with "select all"
    useEffect(() => {
        setIsChecked(false);
    }, [session]);

    // Sync individual checkbox state with "select all"
    useEffect(() => {
        setIsChecked(isAllChecked);
    }, [isAllChecked]);

    // Remove flights from session
    const removeFlight = (sessions: string[]) => {
        const removeSessions = async () => {
            if (sessions.length > 0) {
                setLoading(true);
                try {
                    await removeSessionsByID(sessions);
                } catch (error) {
                    console.log(error);
                } finally {
                    setLoading(false);
                    setReload(!reload);
                }
            }
        };

        removeSessions();
    }

    // Remove student from session
    const removeStudent = (sessionID: string | null) => {
        const removeSessions = async () => {
            if (sessionID) {
                setLoading(true);
                try {
                    const res = await removeStudentFromSessionID(sessionID);
                    if (res.success) {
                        toast({
                            title: res.success,
                        });
                    }
                    if (res.error) {
                        toast({
                            title: "Oups, une erreur est survenue",
                            description: res.error,
                        });
                    }
                } catch (error) {
                    console.log(error);
                } finally {
                    setLoading(false);
                    setReload(!reload);
                }
            }
        };

        removeSessions();
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
                {session.studentFirstName ? (
                    <div className='flex items-center justify-center space-x-1.5'>
                        <p>{session.studentFirstName}</p>
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
                    </div>
                ) : (
                    <AddStudent sessionID={session.id} reload={reload} setReload={setReload} />
                )}
            </TableCell>
            {/* <TableCell className='text-center'>
                {session.flightType}
            </TableCell> */}
            <TableCell className='h-full w-full justify-center items-center flex'>
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
            </TableCell>
        </TableRow>
    );
};

export default TableRowComponent;
