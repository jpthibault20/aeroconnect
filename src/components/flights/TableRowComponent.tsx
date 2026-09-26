/**
 * @file TableRowComponent.tsx
 * @brief Row component for flight sessions.
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
    User as UserIcon,
    GraduationCap,
    PlaneTakeoff,
    Minus,
    Plane as PlaneIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { resolveSessionKind, SESSION_KIND_LABEL, SessionKind } from '@/lib/sessionType';
import { formatSessionDate, formatSessionTime } from '@/api/global function/dateServeur';

// "Type" badge per session kind. The brand purple marks discovery flights,
// consistent with the rest of the feature (public link, calendar). UNDETERMINED
// keeps the same badge, grey with a dashed border: the column stays filled
// without suggesting an already decided kind.
const KIND_STYLES: Record<SessionKind, { className: string; Icon: typeof PlaneIcon }> = {
    UNDETERMINED: { className: "bg-slate-50 text-slate-400 border-slate-200 border-dashed", Icon: Minus },
    THEORETICAL: { className: "bg-blue-50 text-blue-700 border-blue-100", Icon: GraduationCap },
    BAPTEME: { className: "bg-purple-50 text-[#774BBE] border-purple-200", Icon: PlaneTakeoff },
    INSTRUCTION: { className: "bg-orange-50 text-orange-700 border-orange-100", Icon: PlaneIcon },
};

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

    // --- 1. COMPUTATIONS & LOGIC ---

    // Permissions
    const isOwner = session.studentID === currentUser?.id;

    const managementRoles: userRole[] = [userRole.ADMIN, userRole.OWNER, userRole.INSTRUCTOR, userRole.MANAGER];
    const isAdminOrInstructor = currentUser?.role && managementRoles.includes(currentUser.role);

    const canDeleteStudent = isAdminOrInstructor || isOwner;
    const canDeleteSession = isAdminOrInstructor;

    const studentRoles: userRole[] = [userRole.PILOT, userRole.STUDENT];
    const canSubscribe = currentUser?.role && studentRoles.includes(currentUser.role);
    const startDate = new Date(session.sessionDateStart);
    const endDate = new Date(startDate.getTime() + session.sessionDateDuration_min * 60000);
    // Sessions are stored as UTC wall-clock (see lib/clubTime.ts): reading in the
    // browser's local time (toLocaleTimeString without timeZone) shifts the display
    // by the time zone offset, up to +2h in France in summer.
    const formatTime = (date: Date) => formatSessionTime(date);
    const formatDate = (date: Date) => formatSessionDate(date, { day: 'numeric', month: 'short' });


    const planeDisplay = useMemo(() => {
        // Case 1: classroom session
        if (session.planeID.includes("classroomSession")) {
            return { name: "Salle de cours", type: "TH" };
        }

        // Case 2: real plane
        const foundPlane = planesProp.find(p => p.id === session.planeID[0]);

        if (foundPlane) {
            return {
                name: foundPlane.name,
                type: "PLANE"
            };
        }

        // Case 3: unknown
        return { name: "Inconnu", type: "??" };
    }, [session.planeID, planesProp]);

    // Until someone is booked, the type is undetermined (see lib/sessionType).
    const sessionKind = resolveSessionKind(session);
    const kindStyle = KIND_STYLES[sessionKind];
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

    // --- 3. RENDERERS ---

    const renderStudentCell = () => {
        // Case 1: a student is booked
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

        // Case 2: no student, admin/instructor can add one
        if (isAdminOrInstructor) {
            return (
                <AddStudent session={session} setSessions={setSessions} sessions={sessions} planesProp={planesProp} usersProp={usersProp}>

                </AddStudent>
            );
        }

        // Case 3: no student, pilot/student can subscribe
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

            <TableCell className='text-center w-[50px]'>
                <Checkbox checked={isChecked} onCheckedChange={(c) => onChecked(!!c)} />
            </TableCell>

            <TableCell className='text-center font-medium text-slate-700'>
                {formatDate(startDate)}
            </TableCell>

            <TableCell>
                <div className='flex justify-center items-center gap-2 text-sm bg-slate-100/50 py-1 px-2 rounded-md w-fit mx-auto border border-slate-100'>
                    <span className="text-slate-600">{formatTime(startDate)}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-900 font-semibold">{formatTime(endDate)}</span>
                </div>
            </TableCell>

            {/* Session type: only determined once someone is booked */}
            <TableCell className="text-center">
                <div
                    className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                        kindStyle.className
                    )}
                    title={sessionKind === "UNDETERMINED" ? "Type déterminé à l'inscription" : undefined}
                >
                    <kindStyle.Icon className="w-3.5 h-3.5" />
                    {SESSION_KIND_LABEL[sessionKind]}
                </div>
            </TableCell>

            <TableCell className='text-center'>
                <div className="font-medium text-slate-800">
                    {session.pilotLastName.toUpperCase()} {session.pilotFirstName?.charAt(0)}.
                </div>
            </TableCell>

            <TableCell className='text-center'>
                {renderStudentCell()}
            </TableCell>

            <TableCell className='text-center text-slate-600 text-sm'>
                {planeDisplay.name}
            </TableCell>

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