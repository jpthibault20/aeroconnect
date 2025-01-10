import React, { useState } from 'react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'
import { Spinner } from './ui/SpinnerVariants'
import { Club, flight_sessions, User, userRole } from '@prisma/client'
import { removeSessionsByID } from '@/api/db/sessions'
import { toast } from '@/hooks/use-toast';
import { sendNotificationRemoveAppointment, sendNotificationSudentRemoveForPilot } from '@/lib/mail'
import { useCurrentClub } from '@/app/context/useCurrentClub'


interface Props {
    children: React.ReactNode;
    sessions: flight_sessions[];
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    usersProp: User[]
    description: string;
}

const DeleteFlightSession = ({ children, sessions, setSessions, usersProp, description }: Props) => {
    const { currentClub } = useCurrentClub()

    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const removeFlight = (sessionIDProp: flight_sessions[]) => {
        const sessionID = sessionIDProp.length === 1 ? [sessionIDProp[0].id] : sessionIDProp.map(session => session.id);
        const removeSessions = async () => {
            if (sessions.length > 0) {
                const sessionDate = new Date(sessions[0].sessionDateStart.getFullYear(), sessions[0].sessionDateStart.getMonth(), sessions[0].sessionDateStart.getDate(), sessions[0].sessionDateStart.getUTCHours(), sessions[0].sessionDateStart.getUTCMinutes(), 0);
                const nowDate = new Date();

                if (sessionDate.getTime() < nowDate.getTime()) {
                    toast({
                        title: "Impossible de supprimer une session qui est passée",
                        duration: 5000,
                        style: {
                            background: '#ab0b0b', //rouge : ab0b0b
                            color: '#fff',
                        }
                    });
                    setIsOpen(false);
                    return;
                }

                setLoading(true);
                try {
                    const res = await removeSessionsByID(sessionID);
                    if (res.error) {
                        toast({
                            title: res.error,
                            duration: 5000,
                            style: {
                                background: '#ab0b0b', //rouge : ab0b0b
                                color: '#fff',
                            }
                        });
                    }
                    if (res.success) {
                        toast({
                            title: res.success,
                            duration: 5000,
                            style: {
                                background: '#0bab15', //rouge : ab0b0b
                                color: '#fff',
                            }
                        });

                        //supprimer les sessions de la base de données local
                        setSessions(prevSessions => {
                            const updatedSessions = prevSessions.filter(session => !sessionID.includes(session.id));
                            return updatedSessions;
                        });

                        const pilotes = usersProp.filter((items) => items.role === userRole.PILOT || items.role === userRole.OWNER || items.role === userRole.ADMIN);
                        const students = usersProp.filter((items) => items.role === userRole.STUDENT || items.role === userRole.PILOT);
                        const piloteMap = new Map(pilotes.map((pilot) => [pilot.id, pilot.email]));
                        const studentMap = new Map(students.map((student) => [student.id, student.email]));
                        const sessionstype = sessions.filter((session) => sessionID.includes(session.id));

                        for (const session of sessionstype) {
                            const studentEmail = studentMap.get(session.studentID || '');
                            const piloteEmail = piloteMap.get(session.pilotID || '');
                            const endDate = new Date(session.sessionDateStart);
                            endDate.setUTCMinutes(endDate.getUTCMinutes() + session.sessionDateDuration_min);

                            // Envoi des notifications
                            if (studentEmail) {
                                Promise.all([
                                    sendNotificationRemoveAppointment(studentEmail, session.sessionDateStart, endDate, currentClub as Club),
                                    sendNotificationSudentRemoveForPilot(piloteEmail as string, session.sessionDateStart as Date, endDate as Date, currentClub as Club)
                                ])
                            }
                        }
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

    return (
        <AlertDialog open={isOpen}>
            <AlertDialogTrigger onClick={() => setIsOpen(true)}>
                {children}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{sessions.length === 1 ? "Supprimer le vol" : "Supprimer les vols"}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsOpen(false)} disabled={loading}>retour</AlertDialogCancel>
                    {loading ? (
                        <div className="flex justify-center items-center">
                            <Spinner />
                        </div>
                    ) : (
                        <AlertDialogAction
                            className="bg-red-700 hover:bg-red-800 text-white"
                            onClick={() => removeFlight(sessions)}
                        >
                            Supprimer
                        </AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export default DeleteFlightSession
