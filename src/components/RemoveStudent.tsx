import React, { useState } from 'react'
import { Spinner } from './ui/SpinnerVariants'
import { toast } from '@/hooks/use-toast';
import { Club, flight_sessions, User } from '@prisma/client';
import { IoPersonRemove } from 'react-icons/io5';
import { removeStudentFromSessionID } from '@/api/db/sessions';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { useCurrentClub } from '@/app/context/useCurrentClub';
import { sendNotificationRemoveAppointment, sendNotificationSudentRemoveForPilot } from '@/lib/mail';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';

interface Props {
    session: flight_sessions;
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    usersProp: User[]
}

const RemoveStudent = ({ session, setSessions, usersProp }: Props) => {
    const { currentUser } = useCurrentUser()
    const { currentClub } = useCurrentClub()
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);


    const removeStudent = (sessionID: string | null) => {
        const removeSessions = async () => {
            if (sessionID) {
                const sessionDate = new Date(session.sessionDateStart.getFullYear(), session.sessionDateStart.getMonth(), session.sessionDateStart.getDate(), session.sessionDateStart.getUTCHours(), session.sessionDateStart.getUTCMinutes(), 0);
                const nowDate = new Date();

                if (sessionDate.getTime() < nowDate.getTime()) {
                    toast({
                        title: "Impossible de supprimer un élève dans une session passée",
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
                    const student = usersProp.find(item => item.id === session.studentID)
                    const pilote = usersProp.find(item => item.id === session.pilotID)
                    const res = await removeStudentFromSessionID(session, new Date().getTimezoneOffset() as number, currentClub as Club, currentUser as User);
                    if (res.success) {
                        toast({
                            title: res.success,
                            duration: 5000,
                            style: {
                                background: '#0bab15', //rouge : ab0b0b
                                color: '#fff',
                            }
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

                        const endDate = new Date(session.sessionDateStart);
                        endDate.setUTCMinutes(endDate.getUTCMinutes() + session.sessionDateDuration_min);

                        Promise.all([
                            student?.email && sendNotificationRemoveAppointment(
                                student.email,
                                session.sessionDateStart as Date,
                                endDate,
                                currentClub as Club
                            ),
                            pilote?.email && sendNotificationSudentRemoveForPilot(
                                pilote.email,
                                session.sessionDateStart as Date,
                                endDate,
                                currentClub as Club
                            ),
                        ]);
                    }

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
                } catch (error) {
                    console.log(error);
                } finally {
                    setLoading(false);
                }
            }
        };

        removeSessions();
    };


    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger onClick={() => setIsOpen(true)}>
                <IoPersonRemove color='red' />
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Supprimer l&apos;élève</DialogTitle>
                    <DialogDescription>Voulez-vous supprimer l&apos;élève de ce vol ?</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button onClick={() => setIsOpen(false)} disabled={loading}>Annuler</Button>
                    {loading ? (
                        <div className="flex justify-center items-center">
                            <Spinner />
                        </div>
                    ) : (
                        <Button
                            className="bg-red-700 hover:bg-red-800 text-white"
                            onClick={() => removeStudent(session.id)}
                        >
                            Supprimer
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default RemoveStudent
