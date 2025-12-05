/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import React, { useEffect, useState, forwardRef } from 'react'
import { Trash2, Calendar, AlertTriangle, AlertOctagon, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Spinner } from "./ui/SpinnerVariants";
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { useCurrentUser } from "@/app/context/useCurrentUser";
import { Club, flight_sessions, User, userRole } from "@prisma/client";
import { removeSessionsByID } from "@/api/db/sessions";
import { sendNotificationRemoveAppointment, sendNotificationSudentRemoveForPilot } from "@/lib/mail";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { toast } from "@/hooks/use-toast";

// Enregistrement de la locale française pour être sûr
registerLocale('fr', fr);

interface Prop {
    usersProps: User[];
    sessionsProps: flight_sessions[];
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
}

interface DatePickerCustomInputProps {
    value?: string;
    onClick?: () => void;
    className?: string;
    placeholder?: string;
}

// --- COMPOSANT CUSTOM INPUT POUR LE DATEPICKER ---
// Cela remplace l'input moche par défaut par un joli bouton qui s'intègre au design system
const DatePickerCustomInput = forwardRef<HTMLButtonElement, DatePickerCustomInputProps>(({ value, onClick, className, placeholder }, ref) => (
    <Button
        type="button" // Important pour ne pas submit le formulaire si dans un form
        variant="outline"
        className={cn(
            "w-full justify-start text-left font-normal bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 shadow-sm h-10 px-3",
            !value && "text-muted-foreground",
            className
        )}
        onClick={onClick}
        ref={ref}
    >
        <Calendar className="mr-2 h-4 w-4 text-slate-500" />
        <span className='truncate capitalize'>
            {value || <span className="text-slate-400">{placeholder}</span>}
        </span>
    </Button>
));
DatePickerCustomInput.displayName = "DatePickerCustomInput";


const DeleteManySessions = ({ usersProps, sessionsProps, setSessions }: Prop) => {
    const { currentUser } = useCurrentUser()
    const { currentClub } = useCurrentClub()
    const [isOpen, setIsOpen] = useState(false);

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
    if (currentUser?.role === userRole.USER || currentUser?.role === userRole.STUDENT || currentUser?.role === userRole.PILOT) {
        return null
    }

    const onValidate = async () => {
        try {
            setLoading(true);
            setError(null);

            const sessionsIDs = sessionsToDelete.map(session => session.id);
            const res = await removeSessionsByID(sessionsIDs);

            if (res.error) {
                setError(res.error);
                setLoading(false);
                return;
            }

            // Notifications
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
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-600 hover:text-red-600 hover:bg-red-50 flex items-center gap-2 h-8 px-3 transition-colors"
                    aria-label="Suppression multiple"
                >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden xl:inline text-xs font-medium">Nettoyer</span>
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
                        Définissez une période pour supprimer toutes les sessions correspondantes.
                        <br />
                        <span className="text-red-500 font-medium text-xs">Attention : Cette action est irréversible.</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 space-y-6">
                    {/* --- ZONE SÉLECTION DATE PROPRE --- */}
                    <div className="space-y-3">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Période à nettoyer</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-slate-600">À partir du</Label>
                                <DatePicker
                                    selected={startDate}
                                    onChange={(date) => setStartDate(date)}
                                    showTimeSelect
                                    dateFormat="d MMM yyyy à HH:mm"
                                    timeFormat="HH:mm"
                                    timeIntervals={60}
                                    locale="fr"
                                    customInput={<DatePickerCustomInput placeholder="Date de début" />}
                                    wrapperClassName="w-full"
                                    popperClassName="z-50" // Assure que le calendrier passe au dessus
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-slate-600">Jusqu&apos;au</Label>
                                <DatePicker
                                    selected={endDate}
                                    onChange={(date) => setEndDate(date)}
                                    showTimeSelect
                                    dateFormat="d MMM yyyy à HH:mm"
                                    timeFormat="HH:mm"
                                    timeIntervals={60}
                                    locale="fr"
                                    minDate={startDate || undefined}
                                    customInput={<DatePickerCustomInput placeholder="Date de fin" />}
                                    wrapperClassName="w-full"
                                    popperClassName="z-50"
                                />
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
                                    <SelectTrigger className="bg-slate-50 border-slate-200 h-10 shadow-sm">
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
                        <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <AlertOctagon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-red-800">
                                    {sessionsToDelete.length} session(s) trouvée(s)
                                </p>
                                <p className="text-xs text-red-600 mt-1">
                                    En validant, ces sessions seront définitivement supprimées.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center text-sm text-slate-500 italic">
                            Aucune session trouvée dans cette période.
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
                                <span>Tout supprimer</span>
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default DeleteManySessions