import { flight_sessions } from '@prisma/client';
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

interface Props {
    children: React.ReactNode;
    session: flight_sessions;
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
}

const ShowCommentSession = ({ children, session, setSessions }: Props) => {
    const { currentUser } = useCurrentUser()
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [pilotComment, setPilotComment] = useState(session.pilotComment);
    const [studentComment, setStudentComment] = useState(session.studentComment);

    const onClickAction = async () => {
        setLoading(true);
        try {
            const res = await updateCommentSession(session, pilotComment as string, studentComment as string);
            if (res.error) {
                setError(res.error);
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
                setIsOpen(false);
                setSessions(prevSessions => {
                    const updatedSessions = prevSessions.map(s =>
                        s.id === session.id
                            ? { ...s, studentComment: studentComment, pilotComment: pilotComment }
                            : s
                    );
                    return updatedSessions;
                });
                // @TODO: create and implement mail send function to student and pilote
            }
        } catch (error) {
            console.error(error);
            setError("Une erreur est survenue lors de l'envoi des données.");
        } finally {
            setLoading(false);
        }
    };

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
                        <Label>Instructeur</Label>
                        <Textarea
                            value={pilotComment || ""}
                            placeholder='...'
                            disabled={["ADMIN", "OWNER"].includes(currentUser?.role as string) === true ? false : currentUser?.id !== session.pilotID}
                            onChange={(e) => setPilotComment(e.target.value)}
                            className="w-full p-2 text-base border border-gray-300 rounded-md"
                        />
                    </div>
                    <div className='grid gap-2'>
                        <Label>Elève</Label>
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
