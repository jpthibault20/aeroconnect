import React, { useState } from 'react'
import { Spinner } from './ui/SpinnerVariants'
import { toast } from '@/hooks/use-toast';
import { Club, flight_sessions, User } from '@prisma/client';
import { UserMinus, AlertTriangle, Trash2 } from 'lucide-react';
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

    const handleRemoveStudent = async () => {
        const sessionID = session.id;

        // Vérification date passée
        const sessionDate = new Date(session.sessionDateStart);
        const nowDate = new Date();

        if (sessionDate.getTime() < nowDate.getTime()) {
            toast({
                title: "Action impossible",
                description: "Vous ne pouvez pas retirer un élève d'une session passée.",
                variant: "destructive"
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
                    title: "Succès",
                    description: "L'élève a été retiré de la session.",
                    className: "bg-green-600 text-white border-none"
                });

                // Mise à jour de la session locale
                setSessions(prevSessions => {
                    return prevSessions.map(s =>
                        s.id === sessionID
                            ? {
                                ...s,
                                studentID: null,
                                studentFirstName: "",
                                studentLastName: "",
                                studentPlaneID: null,
                            }
                            : s
                    );
                });

                // Envoi des notifications
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

                setIsOpen(false);
            } else if (res.error) {
                toast({
                    title: "Erreur",
                    description: res.error,
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Erreur technique",
                description: "Impossible de retirer l'élève pour le moment.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5 transition-colors"
                >
                    <UserMinus size={14} />
                    Retirer
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[450px] bg-white rounded-xl shadow-2xl p-0 gap-0 overflow-hidden">
                <DialogHeader className="bg-red-50 p-6 border-b border-red-100">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-red-900">
                        <div className="p-2 bg-red-100 rounded-lg border border-red-200">
                            <UserMinus className="w-5 h-5 text-red-600" />
                        </div>
                        Désinscrire l&apos;élève
                    </DialogTitle>
                    <DialogDescription className="text-red-700/80 mt-2">
                        Cette action retirera l&apos;élève de la session de vol et libérera le créneau.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6">
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-700">Conséquences</p>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                L&apos;élève et l&apos;instructeur recevront automatiquement une notification par email pour les informer de cette annulation.
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="bg-slate-50 p-4 border-t border-slate-100 flex sm:justify-end gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => setIsOpen(false)}
                        disabled={loading}
                        className="text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={handleRemoveStudent}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white min-w-[120px]"
                    >
                        {loading ? <Spinner className="text-white w-4 h-4" /> : (
                            <div className="flex items-center gap-2">
                                <Trash2 size={16} />
                                <span>Confirmer</span>
                            </div>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default RemoveStudent;