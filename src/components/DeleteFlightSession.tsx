import React, { useState } from 'react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'
import { Spinner } from './ui/SpinnerVariants'
import { Club, flight_sessions, User } from '@prisma/client'
import { removeSessionsByID } from '@/api/db/sessions'
import { toast } from '@/hooks/use-toast';
import { sendNotificationRemoveAppointment, sendNotificationSudentRemoveForPilot } from '@/lib/mail'
import { useCurrentClub } from '@/app/context/useCurrentClub'
import { Trash2, AlertTriangle } from 'lucide-react'

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

    const handleRemoveFlight = async () => {
        if (sessions.length === 0) return;

        // Vérification date passée (basée sur la première session)
        const sessionDate = new Date(sessions[0].sessionDateStart);
        const nowDate = new Date();

        if (sessionDate.getTime() < nowDate.getTime()) {
            toast({
                title: "Action impossible",
                description: "Vous ne pouvez pas supprimer une session passée.",
                variant: "destructive"
            });
            setIsOpen(false);
            return;
        }

        setLoading(true);
        const sessionIDs = sessions.map(s => s.id);

        try {
            const res = await removeSessionsByID(sessionIDs);

            if (res.error) {
                toast({
                    title: "Erreur",
                    description: res.error,
                    variant: "destructive"
                });
            } else if (res.success) {
                // Envoi des notifications pour chaque session avec élève
                const notifications = [];

                for (const session of sessions) {
                    if (session.studentID) {
                        const student = usersProp.find(item => item.id === session.studentID)
                        const pilote = usersProp.find(item => item.id === session.pilotID)

                        const endDate = new Date(session.sessionDateStart);
                        endDate.setUTCMinutes(endDate.getUTCMinutes() + session.sessionDateDuration_min);

                        if (student?.email) {
                            notifications.push(sendNotificationRemoveAppointment(
                                student.email,
                                session.sessionDateStart,
                                endDate,
                                currentClub as Club
                            ));
                        }
                        if (pilote?.email) {
                            notifications.push(sendNotificationSudentRemoveForPilot(
                                pilote.email,
                                session.sessionDateStart,
                                endDate,
                                currentClub as Club
                            ));
                        }
                    }
                }

                // On attend que les notifs soient parties (ou échouées, sans bloquer l'UI)
                await Promise.allSettled(notifications);

                toast({
                    title: "Succès",
                    description: sessions.length === 1 ? "Le vol a été supprimé." : "Les vols ont été supprimés.",
                    className: "bg-green-600 text-white border-none"
                });

                // Mise à jour de l'état local
                setSessions(prevSessions => prevSessions.filter(session => !sessionIDs.includes(session.id)));
                setIsOpen(false);
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Erreur technique",
                description: "Impossible de supprimer le vol.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                {children}
            </AlertDialogTrigger>
            <AlertDialogContent className="sm:max-w-[500px] bg-white rounded-xl shadow-2xl p-0 gap-0 overflow-hidden border-none">

                {/* Header Danger */}
                <AlertDialogHeader className="bg-red-50 p-6 border-b border-red-100">
                    <AlertDialogTitle className="flex items-center gap-2 text-xl font-bold text-red-900">
                        <div className="p-2 bg-red-100 rounded-lg border border-red-200">
                            <Trash2 className="w-5 h-5 text-red-600" />
                        </div>
                        {sessions.length > 1 ? "Supprimer les vols" : "Supprimer le vol"}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-red-700/80 mt-2">
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {/* Warning Content */}
                <div className="p-6">
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-700">Attention</p>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Cette action est irréversible. Si des élèves sont inscrits, ils recevront une notification d&apos;annulation par email.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <AlertDialogFooter className="bg-slate-50 p-4 border-t border-slate-100 flex sm:justify-end gap-3">
                    <AlertDialogCancel
                        onClick={() => setIsOpen(false)}
                        disabled={loading}
                        className="mt-0 text-slate-500 hover:text-slate-800 hover:bg-slate-200 border-slate-200"
                    >
                        Annuler
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault(); // Empêche la fermeture automatique pour gérer le loading
                            handleRemoveFlight();
                        }}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white min-w-[120px]"
                    >
                        {loading ? <Spinner className="text-white w-4 h-4" /> : (
                            <div className="flex items-center gap-2">
                                <Trash2 size={16} />
                                <span>Confirmer</span>
                            </div>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export default DeleteFlightSession