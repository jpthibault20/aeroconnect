import { Club, flight_sessions, User, userRole } from '@prisma/client';
import React, { useEffect, useState } from 'react'
import { Spinner } from './ui/SpinnerVariants';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { toast } from '@/hooks/use-toast';
import { IoIosWarning, IoMdCreate } from 'react-icons/io';
import { FaUserTie, FaUserGraduate } from "react-icons/fa6"; // Ajout d'icônes pour le design
import { updateCommentSession } from '@/api/db/sessions';
import { sendNotificationUpdateNoteHandler } from '@/lib/mail';
import { receiveType } from '@/lib/utils';
import { useCurrentClub } from '@/app/context/useCurrentClub';
import { cn } from '@/lib/utils'; // Assurez-vous d'avoir cn, sinon retirez-le et utilisez des string templates classiques

interface Props {
    children: React.ReactNode;
    session: flight_sessions;
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    usersProp: User[];
    description?: string;
}

const ShowCommentSession = ({ children, session, setSessions, usersProp, description }: Props) => {
    const { currentUser } = useCurrentUser()
    const { currentClub } = useCurrentClub()
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Initialisation des états locaux
    const [pilotComment, setPilotComment] = useState(session.pilotComment);
    const [studentComment, setStudentComment] = useState(session.studentComment);

    // Synchroniser les états locaux si la session change depuis le parent
    useEffect(() => {
        setPilotComment(session.pilotComment);
        setStudentComment(session.studentComment);
    }, [session]);

    const onClickAction = async () => {
        const isPilotCommentChanged = pilotComment !== session.pilotComment;
        const isStudentCommentChanged = studentComment !== session.studentComment;

        if (!isPilotCommentChanged && !isStudentCommentChanged) {
            setIsOpen(false);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await updateCommentSession(session, pilotComment as string, studentComment as string);

            if (res.error) {
                setError(res.error);
                toast({
                    title: "Erreur",
                    description: res.error,
                    duration: 5000,
                    style: { background: '#ab0b0b', color: '#fff' }
                });
            }

            if (res.success) {
                toast({
                    title: "Succès",
                    description: res.success,
                    duration: 5000,
                    style: { background: '#0bab15', color: '#fff' }
                });
                setIsOpen(false);

                setSessions(prevSessions => {
                    const sessionIndex = prevSessions.findIndex(s => s.id === session.id);
                    if (sessionIndex === -1) return prevSessions;
                    const updatedSessions = [...prevSessions];
                    updatedSessions[sessionIndex] = {
                        ...updatedSessions[sessionIndex],
                        studentComment,
                        pilotComment
                    };
                    return updatedSessions;
                });

                const pilote = usersProp?.find((user) => user.id === session.pilotID) as User;
                const student = usersProp?.find((user) => user.id === session.studentID) as User;

                const receiver = (isPilotCommentChanged && isStudentCommentChanged) ? receiveType.all :
                    (isPilotCommentChanged) ? receiveType.student :
                        receiveType.pilote;

                const newSessionForMail = {
                    ...session,
                    pilotComment: pilotComment,
                    studentComment: studentComment
                };

                if (student) {
                    sendNotificationUpdateNoteHandler({
                        receiver,
                        pilote,
                        student,
                        club: currentClub as Club,
                        session: newSessionForMail
                    });
                }
            }
        } catch (error) {
            console.error(error);
            setError("Une erreur est survenue lors de l'envoi des données.");
        } finally {
            setLoading(false);
        }
    };

    const hasAccess =
        ([userRole.ADMIN, userRole.OWNER, userRole.MANAGER] as userRole[]).includes(currentUser?.role as userRole) ||
        currentUser?.id === session.studentID ||
        currentUser?.id === session.pilotID;

    if (!hasAccess) {
        return null;
    }

    const isAdminOrStaff = ([userRole.ADMIN, userRole.OWNER, userRole.MANAGER] as userRole[]).includes(currentUser?.role as userRole);
    const PRIMARY_COLOR = "#774BBE"; // Votre couleur de thème

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger className='flex items-center justify-center outline-none transition-transform active:scale-95' asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden gap-0">
                {/* Header stylisé */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-start gap-4">
                    <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 hidden sm:block">
                        <IoMdCreate className="w-6 h-6 text-slate-600" />
                    </div>
                    <DialogHeader className="text-left space-y-1">
                        <DialogTitle className="text-xl font-semibold text-slate-800">
                            Notes de session
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 text-sm">
                            {description || "Espace d'échange pédagogique pour ce vol."}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className='flex flex-col gap-6 p-6'>
                    {/* Section Instructeur */}
                    <div className='flex flex-col gap-3 group'>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <span className="p-1.5 rounded-md bg-purple-50 text-[#774BBE]">
                                <FaUserTie />
                            </span>
                            <span className='uppercase tracking-wide text-xs text-slate-500'>Instructeur</span>
                            <span className='font-bold text-slate-800'>
                                {session.pilotLastName && `${session.pilotLastName.toUpperCase()} ${session.pilotFirstName}`}
                            </span>
                        </div>
                        <Textarea
                            id="pilot-comment"
                            value={pilotComment || ""}
                            placeholder="L'instructeur n'a pas encore laissé de note..."
                            disabled={!isAdminOrStaff && currentUser?.id !== session.pilotID}
                            onChange={(e) => setPilotComment(e.target.value)}
                            className={cn(
                                "w-full min-h-[120px] text-sm resize-none border-slate-200 bg-slate-50/50 focus:bg-white transition-all duration-200",
                                "focus-visible:ring-[#774BBE] focus-visible:border-[#774BBE]",
                                (!isAdminOrStaff && currentUser?.id !== session.pilotID) && "opacity-70 bg-slate-100 text-slate-500 cursor-not-allowed"
                            )}
                        />
                    </div>

                    {/* Separator Visuel (optionnel, ou juste l'espace) */}
                    <div className="h-px bg-slate-100 w-full" />

                    {/* Section Élève */}
                    <div className='flex flex-col gap-3 group'>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <span className="p-1.5 rounded-md bg-blue-50 text-blue-600">
                                <FaUserGraduate />
                            </span>
                            <span className='uppercase tracking-wide text-xs text-slate-500'>Élève</span>
                            <span className='font-bold text-slate-800'>
                                {session.studentLastName && `${session.studentLastName.toUpperCase()} ${session.studentFirstName}`}
                            </span>
                        </div>
                        <Textarea
                            id="student-comment"
                            value={studentComment || ""}
                            placeholder="L'élève n'a pas encore laissé de note..."
                            disabled={!isAdminOrStaff && currentUser?.id !== session.studentID}
                            onChange={(e) => setStudentComment(e.target.value)}
                            className={cn(
                                "w-full min-h-[120px] text-sm resize-none border-slate-200 bg-slate-50/50 focus:bg-white transition-all duration-200",
                                "focus-visible:ring-blue-500 focus-visible:border-blue-500", // Ring bleu pour l'élève pour différencier
                                (!isAdminOrStaff && currentUser?.id !== session.studentID) && "opacity-70 bg-slate-100 text-slate-500 cursor-not-allowed"
                            )}
                        />
                    </div>
                </div>

                <DialogFooter className='bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between'>
                    <div className="flex-1 w-full sm:w-auto">
                        {error && (
                            <div className="flex items-center text-red-600 text-sm bg-red-50 p-2 rounded-md border border-red-100">
                                <IoIosWarning className="mr-2 shrink-0 text-lg" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>
                    
                    <div className='flex flex-row items-center gap-3 w-full sm:w-auto justify-end'>
                        <Button
                            variant="ghost"
                            onClick={() => setIsOpen(false)}
                            disabled={loading}
                            className="text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="default"
                            onClick={() => onClickAction()}
                            disabled={loading}
                            style={{ backgroundColor: PRIMARY_COLOR }}
                            className="text-white shadow-md hover:opacity-90 transition-opacity min-w-[120px]"
                        >
                            {loading ? <Spinner className="h-4 w-4 text-white" /> : "Enregistrer"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default ShowCommentSession