/**
 * @file TableRowComponent.tsx
 * @brief Composant de ligne optimisé pour l'affichage des sessions de vol.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { TableCell, TableRow } from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { flight_sessions, planes, User, userRole } from '@prisma/client';
import AddStudent from './AddStudent';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import SessionPopup from '../SessionPopup';
import RemoveStudent from '../RemoveStudent';
import DeleteFlightSession from '../DeleteFlightSession';
import ShowCommentSession from '../ShowCommentSession';
import {
    MessageSquare,
    MessageSquareMore,
    ArrowRight,
    Trash2,
    UserPlus,
    User as UserIcon,
    GraduationCap,
    Plane as PlaneIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

interface Props {
    session: flight_sessions;
    sessions: flight_sessions[];
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    setSessionChecked: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    isAllChecked: boolean;
    planesProp: planes[];
    usersProp: User[];
}

const TableRowComponent = ({
    session,
    sessions,
    setSessions,
    setSessionChecked,
    isAllChecked,
    planesProp,
    usersProp
}: Props) => {
    const { currentUser } = useCurrentUser();
    const [isChecked, setIsChecked] = useState(false);

    // --- 1. CALCULS & LOGIQUE (Sortis du JSX) ---

    // --- 1. CALCULS & LOGIQUE ---

    // Gestion des permissions
    const isOwner = session.studentID === currentUser?.id;

    // Correction TypeScript : On définit le type du tableau explicitement
    const managementRoles: userRole[] = [userRole.ADMIN, userRole.OWNER, userRole.INSTRUCTOR, userRole.MANAGER];
    const isAdminOrInstructor = currentUser?.role && managementRoles.includes(currentUser.role);

    const canDeleteStudent = isAdminOrInstructor || isOwner;
    const canDeleteSession = isAdminOrInstructor;

    // Correction TypeScript ici aussi pour les pilotes/étudiants
    const studentRoles: userRole[] = [userRole.PILOT, userRole.STUDENT];
    const canSubscribe = currentUser?.role && studentRoles.includes(currentUser.role);
    // Gestion des dates
    const startDate = new Date(session.sessionDateStart);
    const endDate = new Date(startDate.getTime() + session.sessionDateDuration_min * 60000);
    const formatTime = (date: Date) => date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const formatDate = (date: Date) => date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });


    // Gestion de l'avion (Memo pour éviter les calculs inutiles)
    const planeDisplay = useMemo(() => {
        // Cas 1 : Session Théorique
        if (session.planeID.includes("classroomSession")) {
            return { name: "Salle de cours", type: "TH" };
        }

        // Cas 2 : Avion Réel
        const foundPlane = planesProp.find(p => p.id === session.planeID[0]);

        if (foundPlane) {
            // On crée un nouvel objet standardisé pour TypeScript
            return {
                name: foundPlane.name,
                type: "PLANE" // On force un type "PLANE" ici
            };
        }

        // Cas 3 : Inconnu
        return { name: "Inconnu", type: "??" };
    }, [session.planeID, planesProp]);

    const isTheoretical = planeDisplay.type === "TH";
    // --- 2. SYNC CHECKBOX ---
    useEffect(() => {
        setIsChecked(isAllChecked);
    }, [isAllChecked]);

    const onChecked = (checked: boolean) => {
        setIsChecked(checked);
        setSessionChecked((prev) => {
            if (checked) return [...prev, session];
            return prev.filter(s => s.id !== session.id);
        });
    };

    // --- 3. RENDERERS (Pour alléger le return principal) ---

    const renderStudentCell = () => {
        // Cas 1 : Il y a un élève inscrit
        if (session.studentID && session.studentLastName) {
            return (
                <div className='flex items-center justify-center gap-2 group'>
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                        <UserIcon className="w-3 h-3 text-slate-400" />
                        <span className="font-medium text-slate-700">
                            {session.studentLastName.toUpperCase()} {session.studentFirstName?.charAt(0)}.
                        </span>
                    </div>
                    {canDeleteStudent && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <RemoveStudent session={session} setSessions={setSessions} usersProp={usersProp} />
                        </div>
                    )}
                </div>
            );
        }

        // Cas 2 : Pas d'élève - Admin/Instructeur peut ajouter
        if (isAdminOrInstructor) {
            return (
                <AddStudent session={session} setSessions={setSessions} sessions={sessions} planesProp={planesProp} usersProp={usersProp}>

                </AddStudent>
            );
        }

        // Cas 3 : Pas d'élève - Pilote/Élève peut s'inscrire
        if (canSubscribe) {
            return (
                <SessionPopup sessions={[session]} setSessions={setSessions} usersProps={usersProp} planesProp={planesProp} noSessions={true}>
                    <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white shadow-sm">
                        S&apos;inscrire
                    </Button>
                </SessionPopup>
            );
        }

        return <span className="text-slate-300">-</span>;
    };

    return (
        <TableRow className={cn("group transition-colors hover:bg-slate-50/80", isChecked && "bg-purple-50/30")}>

            {/* Checkbox */}
            <TableCell className='text-center w-[50px]'>
                <Checkbox checked={isChecked} onCheckedChange={(c) => onChecked(!!c)} />
            </TableCell>

            {/* Date */}
            <TableCell className='text-center font-medium text-slate-700'>
                {formatDate(startDate)}
            </TableCell>

            {/* Horaire */}
            <TableCell>
                <div className='flex justify-center items-center gap-2 text-sm bg-slate-100/50 py-1 px-2 rounded-md w-fit mx-auto border border-slate-100'>
                    <span className="text-slate-600">{formatTime(startDate)}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-900 font-semibold">{formatTime(endDate)}</span>
                </div>
            </TableCell>

            {/* Type de vol (Avion / Théorie) */}
            <TableCell className="text-center">
                <div className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                    isTheoretical
                        ? "bg-blue-50 text-blue-700 border-blue-100"
                        : "bg-orange-50 text-orange-700 border-orange-100"
                )}>
                    {isTheoretical ? <GraduationCap className="w-3.5 h-3.5" /> : <PlaneIcon className="w-3.5 h-3.5" />}
                    {isTheoretical ? "Théorique" : "Vol"}
                </div>
            </TableCell>

            {/* Instructeur */}
            <TableCell className='text-center'>
                <div className="font-medium text-slate-800">
                    {session.pilotLastName.toUpperCase()} {session.pilotFirstName?.charAt(0)}.
                </div>
            </TableCell>

            {/* Élève (Logique complexe encapsulée) */}
            <TableCell className='text-center'>
                {renderStudentCell()}
            </TableCell>

            {/* Avion (Nom) */}
            <TableCell className='text-center text-slate-600 text-sm'>
                {planeDisplay.name}
            </TableCell>

            {/* Commentaires */}
            <TableCell className='text-center'>
                <ShowCommentSession session={session} setSessions={setSessions} usersProp={usersProp}>
                    <div className={cn(
                        "p-2 rounded-full transition-all cursor-pointer inline-flex",
                        (session.studentComment || session.pilotComment)
                            ? "text-[#774BBE] bg-purple-50 hover:bg-purple-100"
                            : "text-slate-300 hover:text-slate-500 hover:bg-slate-100"
                    )}>
                        {(session.studentComment || session.pilotComment)
                            ? <MessageSquareMore className='w-4 h-4' />
                            : <MessageSquare className='w-4 h-4' />
                        }
                    </div>
                </ShowCommentSession>
            </TableCell>

            {/* Actions (Supprimer) */}
            <TableCell className='text-right'>
                {canDeleteSession && (
                    <DeleteFlightSession
                        description={`Supprimer le vol du ${formatDate(startDate)} ?`}
                        sessions={[session]}
                        setSessions={setSessions}
                        usersProp={usersProp}
                    >
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </DeleteFlightSession>
                )}
            </TableCell>
        </TableRow>
    );
};

export default TableRowComponent;