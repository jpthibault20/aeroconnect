import { flight_sessions, planes, User, userRole } from '@prisma/client'
import React from 'react'
import { MessageSquare, Plane, User as UserIcon, Trash2, GraduationCap, AlertTriangle } from 'lucide-react'
import { useCurrentUser } from '@/app/context/useCurrentUser'
import AddStudent from './flights/AddStudent'
import RemoveStudent from './RemoveStudent'
import DeleteFlightSession from './DeleteFlightSession'
import ShowCommentSession from './ShowCommentSession'
import { cn } from '@/lib/utils'
// IMPORT DU NOUVEAU COMPOSANT
import CompleteFlightModal from './CompleteFlightModal'
import { completeFlightSession } from '@/api/db/sessions'
import { toast } from '@/hooks/use-toast'

interface Prop {
    sessions: flight_sessions[]
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>
    usersProps: User[]
    planesProp: planes[]
}

const SessionPopupUpdate = ({ sessions, setSessions, usersProps, planesProp }: Prop) => {
    const { currentUser } = useCurrentUser()

    const formatName = (lastName: string, firstName: string) => {
        if (!lastName || !firstName) return "...";
        return `${lastName.slice(0, 1).toUpperCase()}.${firstName}`;
    };

    // Fonction Placeholder pour l'API (à remplacer par ton vrai appel API/Server Action)
    const handleCompleteFlight = async (data: any) => {
        try {
            // Appel de la Server Action créée précédemment
            const res = await completeFlightSession(data, currentUser!);

            if (res.error) {
                // Si le back renvoie une erreur, on lève une exception pour que le Modal le sache
                throw new Error(res.error);
            }

            // Si Succès : On met à jour l'affichage localement sans recharger la page
            setSessions(prev => prev.map(s =>
                s.id === data.sessionId
                    ? { ...s, ...data, isCompleted: true } // On fusionne les nouvelles données
                    : s
            ));

            toast({
                title: "Vol clôturé !",
                description: "Les données et le compteur de l'avion ont été mis à jour.",
                className: "bg-green-600 text-white border-none"
            });

        } catch (error: any) {
            // On renvoie l'erreur pour que le Modal puisse l'afficher et rester ouvert
            throw error;
        }
    }

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Gestion des vols</span>
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{sessions.length}</span>
            </h3>

            <div className={cn(
                "grid gap-4",
                sessions.length > 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
            )}>
                {sessions.map((s, index) => {
                    // 1. VERIFICATION DES DROITS
                    const isAuthorized =
                        currentUser?.role === userRole.ADMIN ||
                        currentUser?.role === userRole.OWNER ||
                        currentUser?.role === userRole.MANAGER ||
                        currentUser?.id === s.pilotID;

                    // 2. VERIFICATION DU TEMPS (Vol terminé ?)
                    const now = new Date();
                    const sessionStart = new Date(s.sessionDateStart);

                    // On calcule la fin : Date de début + (Durée en minutes * 60000 ms)
                    const sessionEnd = new Date(sessionStart.getTime() + (s.sessionDateDuration_min * 60000));

                    const isFinished = now > sessionEnd;

                    // 3. VERIFICATION DE L'ELEVE
                    const hasStudent = !!s.studentID && s.studentPlaneID !== "noPlane";

                    // Condition globale pour afficher le bouton "Clôturer"
                    const canCompleteSession = isAuthorized && isFinished && hasStudent;


                    const planeName = s.studentPlaneID === "classroomSession" ? "Théorique" :
                        s.studentPlaneID === "noPlane" ? "Sans appareil" :
                            s.studentID ? planesProp.find((plane) => plane.id === s.studentPlaneID)?.name : "...";

                    const hasNotes = s.pilotComment || s.studentComment;
                    const notesCount = (s.pilotComment && s.studentComment) ? 2 : hasNotes ? 1 : 0;

                    return (
                        <div
                            key={index}
                            className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col relative group"
                        >
                            {/* Header: Pilote + Suppression */}
                            <div className="flex justify-between items-center p-3 bg-slate-50 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="bg-blue-100 p-1.5 rounded-md text-blue-600 shadow-sm">
                                        <UserIcon size={14} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold leading-none mb-0.5">Instructeur</p>
                                        <p className="text-sm font-semibold text-slate-700 leading-tight">
                                            {formatName(s.pilotLastName, s.pilotFirstName)}
                                        </p>
                                    </div>
                                </div>

                                {isAuthorized && (
                                    <DeleteFlightSession
                                        description={`Ce vol sera supprimé définitivement, et les participants notifiés.`}
                                        sessions={[s]}
                                        setSessions={setSessions}
                                        usersProp={usersProps}
                                    >
                                        <button
                                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            title="Supprimer le vol"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </DeleteFlightSession>
                                )}
                            </div>

                            {/* Body */}
                            <div className="p-4 flex-1 flex flex-col gap-4">

                                {/* Slot Étudiant */}
                                <div className="flex flex-col gap-2">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Élève inscrit</p>

                                    {s.studentID ? (
                                        <div className="flex items-center justify-between bg-emerald-50/50 border border-emerald-100 rounded-lg p-2 transition-colors hover:bg-emerald-50">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-emerald-100 p-1 rounded-full">
                                                    <GraduationCap className="text-emerald-600" size={14} />
                                                </div>
                                                <span className="text-sm font-medium text-emerald-900">
                                                    {formatName(s.studentLastName || "", s.studentFirstName || "")}
                                                </span>
                                            </div>
                                            {isAuthorized && (
                                                <RemoveStudent
                                                    session={s}
                                                    setSessions={setSessions}
                                                    usersProp={usersProps}
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between border border-dashed border-slate-300 rounded-lg p-2 bg-slate-50/30">
                                            <span className="text-xs text-slate-500 italic flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                                Place disponible
                                            </span>
                                            {isAuthorized && (
                                                <div className="scale-95 origin-right">
                                                    <AddStudent
                                                        session={s}
                                                        sessions={sessions}
                                                        setSessions={setSessions}
                                                        planesProp={planesProp}
                                                        usersProp={usersProps}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Zone d'Action : Clôture du vol */}
                                {canCompleteSession && (
                                    <div className="pt-2">
                                        {/* On pourrait vérifier ici si le vol est déjà clôturé (ex: s.status === 'COMPLETED') pour afficher un badge vert à la place */}
                                        <CompleteFlightModal
                                            session={s}
                                            onComplete={handleCompleteFlight}
                                        />
                                    </div>
                                )}

                                {!isFinished && hasStudent && (
                                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded text-xs">
                                        <AlertTriangle size={12} />
                                        <span>Vol en cours ou à venir</span>
                                    </div>
                                )}

                                <div className="h-px bg-slate-100 w-full" />

                                {/* Footer: Avion & Notes */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-600" title="Appareil utilisé">
                                        <Plane size={14} className="text-slate-400" />
                                        <span className="text-xs font-medium truncate max-w-[120px]">{planeName}</span>
                                    </div>

                                    <ShowCommentSession
                                        session={s}
                                        setSessions={setSessions}
                                        usersProp={usersProps}
                                    >
                                        <div className={cn(
                                            "flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition-colors text-xs font-medium border",
                                            hasNotes
                                                ? "bg-purple-50 text-[#774BBE] border-purple-100 hover:bg-purple-100"
                                                : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50 hover:text-slate-600"
                                        )}>
                                            <MessageSquare size={12} />
                                            <span>{notesCount > 0 ? `${notesCount}` : '+ Note'}</span>
                                        </div>
                                    </ShowCommentSession>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default SessionPopupUpdate