import { Club, flight_sessions, User } from '@prisma/client';
import React, { useState } from 'react'
import { Spinner } from './ui/SpinnerVariants';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from '@/hooks/use-toast';
import { IoIosWarning } from 'react-icons/io';
import { updateCommentSession } from '@/api/db/sessions';
import { sendNotificationUpdateNoteHandler } from '@/lib/mail';
import { receiveType } from '@/lib/utils';
import { useCurrentClub } from '@/app/context/useCurrentClub';

interface Props {
    children: React.ReactNode;
    session: flight_sessions;
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    usersProp: User[];
}

const ShowCommentSession = ({ children, session, setSessions, usersProp }: Props) => {
    const { currentUser } = useCurrentUser()
    const { currentClub } = useCurrentClub()
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [pilotComment, setPilotComment] = useState(session.pilotComment);
    const [studentComment, setStudentComment] = useState(session.studentComment);

    const onClickAction = async () => {
        // Check if any comments have changed before proceeding
        const isPilotCommentChanged = pilotComment !== session.pilotComment;
        const isStudentCommentChanged = studentComment !== session.studentComment;

        // If nothing changed, simply close the modal and return
        if (!isPilotCommentChanged && !isStudentCommentChanged) {
            setIsOpen(false);
            return;
        }

        setLoading(true);
        try {
            const res = await updateCommentSession(session, pilotComment as string, studentComment as string);
            if (res.error) {
                setError(res.error);
                toast({
                    title: res.error,
                    duration: 5000,
                    style: {
                        background: '#ab0b0b', // red: ab0b0b
                        color: '#fff',
                    }
                });
            }
            if (res.success) {
                toast({
                    title: res.success,
                    duration: 5000,
                    style: {
                        background: '#0bab15', // green: 0bab15
                        color: '#fff',
                    }
                });
                setIsOpen(false);

                // Update sessions with new comments
                setSessions(prevSessions => {
                    // Trouver l'index de la session à modifier
                    const sessionIndex = prevSessions.findIndex(s => s.id === session.id);

                    // Si la session n'est pas trouvée, retourner le tableau inchangé
                    if (sessionIndex === -1) return prevSessions;

                    // Créer une copie du tableau
                    const updatedSessions = [...prevSessions];

                    // Mettre à jour uniquement la session spécifique
                    updatedSessions[sessionIndex] = {
                        ...updatedSessions[sessionIndex],
                        studentComment,
                        pilotComment
                    };

                    return updatedSessions;
                });


                // Lookup users only once
                const pilote = usersProp?.find((user) => user.id === session.pilotID) as User;
                const student = usersProp?.find((user) => user.id === session.studentID) as User;

                // Determine notification recipient based on changes
                const receiver = (isPilotCommentChanged && isStudentCommentChanged) ? receiveType.all :
                    (isPilotCommentChanged) ? receiveType.student :
                        receiveType.pilote;

                // @TODO: Optimization by deleting the creation of this object. a bug persists, I have the old sessions even with a setstate
                // Create new session object with updated comments
                const newSession = { ...session, pilotComment, studentComment };

                // Send notification with appropriate recipient
                sendNotificationUpdateNoteHandler({
                    receiver,
                    pilote,
                    student,
                    club: currentClub as Club,
                    session: newSession
                });
            }
        } catch (error) {
            console.error(error);
            setError("Une erreur est survenue lors de l'envoi des données.");
        } finally {
            setLoading(false);
        }
    };

    if (["ADMIN", "OWNER"]!.includes(currentUser?.role as string) || (currentUser?.id !== session.studentID && currentUser?.id !== session.pilotID)) {
        return null
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger className='flex items-center justify-center'>
                {children}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Notes</DialogTitle>
                    <DialogDescription>Voir et/ou modifier les notes</DialogDescription>
                </DialogHeader>
                <div className='grid gap-4'>
                    <div className='grid gap-2'>
                        <Label>Instructeur {`(${session.pilotLastName.slice(0,1).toUpperCase()}.${session.pilotFirstName})`}</Label>
                        <Textarea
                            value={pilotComment || ""}
                            placeholder='...'
                            disabled={["ADMIN", "OWNER"].includes(currentUser?.role as string) === true ? false : currentUser?.id !== session.pilotID}
                            onChange={(e) => setPilotComment(e.target.value)}
                            className="w-full p-2 text-base border border-gray-300 rounded-md"
                        />
                    </div>
                        <div className='grid gap-2'>
                        <Label>Elève {(session.studentFirstName && session.studentLastName) ? `(${session.studentLastName.slice(0,1).toUpperCase()}.${session.studentFirstName})` : ""}</Label>
                        <Textarea
                            value={studentComment || ""}
                            placeholder='...'
                            disabled={["ADMIN", "OWNER"].includes(currentUser?.role as string) === true ? false : currentUser?.id !== session.studentID}
                            onChange={(e) => setStudentComment(e.target.value)}
                            className="w-full p-2 text-base border border-gray-300 rounded-md"
                        />
                    </div>
                    
                </div>
                <DialogFooter className='w-full'>
                    {error && (
                        <div className="flex items-center text-destructive mb-4">
                            <IoIosWarning className="mr-2" />
                            <span>{error}</span>
                        </div>
                    )}
                    <span className='flex flex-row items-center justify-end'>
                        <span>
                            <Button variant="link" aria-label='Annuler' onClick={() => setIsOpen(false)} className='w-fit text-gray-500' disabled={loading}>
                                Retour
                            </Button>
                        </span>
                        <span>
                            <Button variant="perso" onClick={() => onClickAction()} disabled={loading} className='w-fit' aria-label='Enregistrer la session'>
                                {loading ? (
                                    <Spinner />
                                ) : "Enregistrer"}
                            </Button>
                        </span>
                    </span>



                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default ShowCommentSession
