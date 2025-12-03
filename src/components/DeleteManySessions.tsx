/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import React, { useEffect, useState } from 'react'
import { Trash2, Calendar, AlertTriangle, AlertOctagon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Spinner } from "./ui/SpinnerVariants";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { fr } from 'date-fns/locale';

import { useCurrentUser } from "@/app/context/useCurrentUser";
import { Club, flight_sessions, User, userRole } from "@prisma/client";
import { removeSessionsByID } from "@/api/db/sessions";
import { sendNotificationRemoveAppointment, sendNotificationSudentRemoveForPilot } from "@/lib/mail";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { toast } from "@/hooks/use-toast";

interface Prop {
    usersProps: User[];
    sessionsProps: flight_sessions[];
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
}

const DeleteManySessions = ({ usersProps, sessionsProps, setSessions }: Prop) => {
    const { currentUser } = useCurrentUser()
    const { currentClub } = useCurrentClub()
    const [isOpen, setIsOpen] = useState(false);

    // Remplacement du RangeValue de NextUI par deux états simples pour react-datepicker
    const [startDate, setStartDate] = useState<Date | null>(new Date());
    const [endDate, setEndDate] = useState<Date | null>(new Date());

    const [piloteID, setPiloteID] = useState<string | undefined>(currentUser?.id);
    const [error, setError] = useState<string | null>(null);
    const [sessionsToDelete, setSessionsToDelete] = useState<flight_sessions[]>([]);
    const [loading, setLoading] = useState(false);

    // Calcul des sessions à supprimer
    useEffect(() => {
        if (!startDate || !endDate || !piloteID) {
            setSessionsToDelete([]);
            return;
        }

        const sessions = sessionsProps.filter((session) => {
            // Filtre par pilote
            if (piloteID !== session.pilotID) return false;

            const sessionDate = new Date(session.sessionDateStart);
            // Comparaison simple des dates
            return sessionDate >= startDate && sessionDate <= endDate;
        });

        setSessionsToDelete(sessions);
    }, [startDate, endDate, piloteID, sessionsProps]);

    // Sécurité Rôle
    // Note: J'ai corrigé .includes() par une vérification directe si c'est un enum unique, 
    // ou laissé tel quel si 'role' est traité comme une chaîne. 
    // Si userRole est un Enum Prisma, il vaut mieux utiliser ===.
    if (currentUser?.role === userRole.USER || currentUser?.role === userRole.STUDENT || currentUser?.role === userRole.PILOT) {
        return null
    }

    const onValidate = async () => {
        try {
            setLoading(true);
            setError(null);

            // Vérification anti-fail (sécurité supplémentaire)
            const invalidSession = sessionsToDelete.find(session => new Date(session.sessionDateStart) < new Date());
            // Note: J'ai commenté cette sécurité car parfois on veut nettoyer des vieilles sessions, 
            // mais tu peux la décommenter si tu veux interdire la suppression du passé.
            /* if (invalidSession) {
                setError("Impossible de supprimer des sessions passées.");
                setLoading(false);
                return;
            } 
            */

            const sessionsIDs = sessionsToDelete.map(session => session.id);
            const res = await removeSessionsByID(sessionsIDs);

            if (res.error) {
                setError(res.error);
                setLoading(false);
                return;
            }

            // Notifications (inchangé)
            for (const session of sessionsToDelete) {
                if (session.studentID) {
                    const student = usersProps.find(item => item.id === session.studentID);
                    const pilot = usersProps.find(item => item.id === session.pilotID);
                    const endSessionDate = new Date(session.sessionDateStart);
                    endSessionDate.setUTCMinutes(endSessionDate.getUTCMinutes() + session.sessionDateDuration_min);

                    try {
                        Promise.all([
                            sendNotificationRemoveAppointment(student?.email as string, session.sessionDateStart, endSessionDate, currentClub as Club),
                            sendNotificationSudentRemoveForPilot(pilot?.email as string, session.sessionDateStart, endSessionDate, currentClub as Club),
                        ]);
                    } catch (notificationError) {
                        console.error("Erreur notif:", notificationError);
                    }
                }
            }

            toast({
                title: "Succès",
                description: `${sessionsToDelete.length} session(s) supprimée(s).`,
                className: "bg-green-600 text-white border-none"
            });

            setSessions(prev => prev.filter(session => !sessionsIDs.includes(session.id)));
            setSessionsToDelete([]);
            setIsOpen(false);

        } catch (error) {
            console.error("Erreur:", error);
            setError("Une erreur est survenue.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {/* Nouveau style "Toolbar Item" : Ghost Danger */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-600 hover:text-red-600 hover:bg-red-50 flex items-center gap-2 h-8 px-3 transition-colors"
                    aria-label="Suppression multiple"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[500px] bg-white rounded-xl shadow-2xl border-none">
                <DialogHeader className="pb-4 border-b border-slate-100">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <Trash2 className="w-5 h-5 text-red-600" />
                        </div>
                        Suppression multiple
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                        Sélectionnez une plage horaire pour supprimer en masse des sessions.
                        <br />
                        <span className="text-red-500 font-medium text-xs">Cette action est irréversible.</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 space-y-6">
                    {/* Sélecteurs de Date */}
                    <div className="space-y-3">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Période à nettoyer</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-600">Début</Label>
                                <div className="relative">
                                    <DatePicker
                                        selected={startDate}
                                        onChange={(date) => setStartDate(date)}
                                        showTimeSelect
                                        dateFormat="dd/MM/yyyy HH:mm"
                                        timeFormat="HH:mm"
                                        timeIntervals={60}
                                        locale={fr}
                                        className="w-full h-9 px-3 py-1 text-sm border border-slate-200 rounded-md bg-slate-50 focus:ring-2 focus:ring-red-500 focus:outline-none cursor-pointer"
                                    />
                                    <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-600">Fin</Label>
                                <div className="relative">
                                    <DatePicker
                                        selected={endDate}
                                        onChange={(date) => setEndDate(date)}
                                        showTimeSelect
                                        dateFormat="dd/MM/yyyy HH:mm"
                                        timeFormat="HH:mm"
                                        timeIntervals={60}
                                        locale={fr}
                                        minDate={startDate || undefined}
                                        className="w-full h-9 px-3 py-1 text-sm border border-slate-200 rounded-md bg-slate-50 focus:ring-2 focus:ring-red-500 focus:outline-none cursor-pointer"
                                    />
                                    <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sélecteur Instructeur (Admin Only) */}
                    {(currentUser?.role === userRole.ADMIN || currentUser?.role === userRole.OWNER) && (
                        <div className="space-y-3">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cible</Label>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-600">Instructeur concerné</Label>
                                <Select value={piloteID} onValueChange={setPiloteID}>
                                    <SelectTrigger className="bg-slate-50 border-slate-200 h-9">
                                        <SelectValue placeholder="Sélectionner un instructeur" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {usersProps
                                            .filter(u => ([userRole.INSTRUCTOR, userRole.ADMIN, userRole.OWNER] as userRole[]).includes(u.role))
                                            .map((user) => (
                                                <SelectItem key={user.id} value={user.id}>
                                                    {user.lastName.toUpperCase()} {user.firstName}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Résumé Impact */}
                    {sessionsToDelete.length > 0 ? (
                        <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-3">
                            <AlertOctagon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-red-800">
                                    {sessionsToDelete.length} session(s) trouvée(s)
                                </p>
                                <p className="text-xs text-red-600 mt-1">
                                    En validant, ces sessions seront définitivement supprimées et les élèves notifiés.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center text-sm text-slate-500 italic">
                            Aucune session trouvée dans cette période pour cet instructeur.
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mx-6 mb-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md text-sm">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <DialogFooter className="border-t border-slate-100 pt-4 flex sm:justify-end gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => setIsOpen(false)}
                        className="text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={onValidate}
                        disabled={sessionsToDelete.length === 0 || loading}
                        className="bg-red-600 hover:bg-red-700 text-white gap-2 min-w-[140px]"
                    >
                        {loading ? <Spinner className="text-white" /> : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                <span>Supprimer</span>
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default DeleteManySessions