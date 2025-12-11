import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { addStudentToSession, InvitedStudent } from '@/api/db/users';
import { flight_sessions, planes, User, userRole } from '@prisma/client';
import { Button } from '../ui/button';
import { toast } from '@/hooks/use-toast';
import { Spinner } from '../ui/SpinnerVariants';
import { getFreePlanesUsers } from '@/api/popupCalendar';
import { sendNotificationBooking, sendStudentNotificationBooking } from '@/lib/mail';
import { AlertCircle, UserPlus, Plane, User as UserIcon, Check } from 'lucide-react';
import InvitedForm from './InvitedForm';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { Label } from '../ui/label';

interface Props {
    session: flight_sessions;
    sessions: flight_sessions[];
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    planesProp: planes[];
    usersProp: User[]
}

const AddStudent = ({ session, sessions, setSessions, planesProp, usersProp }: Props) => {
    const { currentUser } = useCurrentUser()
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState("");
    const [freeStudents, setFreeStudents] = useState<{ id: string, name: string }[]>([]);
    const [studentId, setStudentId] = useState<string>("");
    const [freePlanes, setFreePlanes] = useState<{ id: string, name: string }[]>([]);
    const [planeId, setPlaneId] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [warningStudent, setWarningStudent] = useState("");
    const [warningPlane, setWarningPlane] = useState("");
    const [invitedStudent, setInvitedStudent] = useState<InvitedStudent>({
        firstName: "",
        lastName: "",
        email: "",
        phone: ""
    });

    const PRIMARY_COLOR = "#774BBE";

    // --- LOGIQUE METIER (Inchangée) ---

    const filterStudentsByPlane = (planeId: string) => {
        const { students } = getFreePlanesUsers(session, sessions, usersProp, planesProp);
        if (!planeId || planeId === " " || planeId === "classroomSession") {
            return students.map(student => ({
                id: student.id,
                name: `${student.lastName} ${student.firstName}`
            }));
        }

        const selectedPlane = planesProp.find(plane => plane.id === planeId);
        if (!selectedPlane) return [];

        return students.filter(student => {
            const userClasses = student.classes || [];
            return userClasses.includes(selectedPlane.classes);
        }).map(student => ({
            id: student.id,
            name: `${student.lastName} ${student.firstName}`
        }));
    };

    const filterPlanesByStudent = (studentId: string) => {
        if (!studentId) return [];

        const { planes } = getFreePlanesUsers(session, sessions, usersProp, planesProp);
        let planesRes: { id: string, name: string }[] = [];

        if (studentId === "invited") {
            planesRes = planes.map(plane => ({ id: plane.id, name: plane.name }));
        }
        else if (studentId) {
            for (const plane of planes) {
                const userClasses = usersProp.find(user => user.id === studentId)?.classes || [];
                if (userClasses.includes(plane.classes)) {
                    planesRes.push({ id: plane.id, name: plane.name });
                }
            }
        }

        if (session.planeID.includes("classroomSession")) {
            planesRes.push({ id: "classroomSession", name: "Session théorique" });
        }

        return planesRes;
    };

    useEffect(() => {
        if (planeId && planeId !== " ") {
            setFreeStudents(filterStudentsByPlane(planeId));
        } else if (studentId && studentId !== " ") {
            setFreePlanes(filterPlanesByStudent(studentId));
        } else {
            const { students, planes } = getFreePlanesUsers(session, sessions, usersProp, planesProp);
            setFreeStudents(students.map(student => ({
                id: student.id,
                name: `${student.lastName} ${student.firstName}`
            })));

            if (session.planeID.includes("classroomSession")) {
                setFreePlanes([
                    ...planes.map(plane => ({ id: plane.id, name: plane.name })),
                    { id: "classroomSession", name: "Session théorique" }
                ]);
            } else {
                setFreePlanes(planes.map(plane => ({ id: plane.id, name: plane.name })));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planeId, studentId, session, sessions, usersProp, planesProp]);

    useEffect(() => {
        if (freePlanes.length === 1) {
            setPlaneId(freePlanes[0].id);
        }
    }, [freePlanes]);

    useEffect(() => {
        if (freeStudents.length === 0 && planeId !== "noPlane") {
            setWarningStudent("Aucun étudiant autorisé pour cette classe d'avion.");
        } else {
            setWarningStudent("");
        }
    }, [freeStudents, planeId]);

    useEffect(() => {
        if (freePlanes.length === 0) {
            setWarningPlane("Aucun avion disponible pour cet étudiant.");
        } else {
            setWarningPlane("");
        }
    }, [freePlanes]);

    const handleStudentChange = (value: string) => {
        setStudentId(value);
        if (value === " ") setPlaneId(" ");
    };

    const handlePlaneChange = (value: string) => {
        setPlaneId(value);
        if (value === " ") setStudentId(" ");
    };

    const onClickAction = async () => {
        setLoading(true);
        setError("");

        if (studentId) {
            const selectedUser = usersProp.find(user => user.id === studentId);

            if (selectedUser || studentId === 'invited') {
                try {
                    const res = await addStudentToSession(session.id, {
                        id: studentId,
                        firstName: studentId === 'invited' ? invitedStudent.firstName : selectedUser?.firstName as string,
                        lastName: studentId === 'invited' ? invitedStudent.lastName : selectedUser?.lastName as string,
                        planeId,
                        email: studentId === 'invited' ? invitedStudent.email : usersProp.find(user => user.id === studentId)?.email as string,
                        phone: studentId === 'invited' ? invitedStudent.phone : usersProp.find(user => user.id === studentId)?.phone as string,
                    }, new Date().getTimezoneOffset() as number);

                    if (res.error) {
                        setError(res.error);
                        toast({
                            title: "Erreur",
                            description: res.error,
                            variant: "destructive",
                        });
                    }

                    if (res.success) {
                        toast({
                            title: "Succès",
                            description: res.success,
                            style: { background: '#0bab15', color: '#fff' }
                        });

                        const endDate = new Date(session.sessionDateStart);
                        endDate.setUTCMinutes(endDate.getUTCMinutes() + session.sessionDateDuration_min);
                        const instructor = usersProp.find((user) => user.id === session.pilotID);
                        const planeName = planeId === "classroomSession" ? "Théorique" : planesProp.find((p) => p.id === planeId)?.name;

                        Promise.all([
                            sendNotificationBooking(
                                instructor?.email || "",
                                studentId === 'invited' ? invitedStudent.firstName : selectedUser?.firstName as string,
                                studentId === 'invited' ? invitedStudent.lastName : selectedUser?.lastName as string,
                                session.sessionDateStart,
                                endDate,
                                session.clubID,
                                planeName as string,
                                session.pilotComment as string,
                                session.studentComment as string
                            ),
                            sendStudentNotificationBooking(
                                studentId === 'invited' ? invitedStudent.email : selectedUser?.email as string,
                                session.sessionDateStart,
                                endDate,
                                session.clubID,
                                planeName as string,
                                session.pilotComment as string,
                                session.studentComment as string
                            ),
                        ]);

                        setSessions(prevSessions => {
                            return prevSessions.map(s =>
                                s.id === session.id
                                    ? {
                                        ...s,
                                        studentID: studentId,
                                        studentFirstName: studentId === 'invited' ? invitedStudent.firstName : selectedUser?.firstName as string,
                                        studentLastName: studentId === 'invited' ? invitedStudent.lastName : selectedUser?.lastName as string,
                                        studentPlaneID: planeId,
                                    }
                                    : s
                            );
                        });
                        setStudentId(" ");
                        setPlaneId(" ");
                        setIsOpen(false);
                    }
                } catch (err) {
                    console.error(err);
                    setError("Une erreur technique est survenue.");
                } finally {
                    setLoading(false);
                }
            } else {
                setError("Étudiant introuvable");
                setLoading(false);
            }
        } else {
            setError("Veuillez sélectionner un étudiant");
            setLoading(false);
        }
    };

    // --- 2. UI REFONTE ---
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs font-medium text-slate-600 hover:text-[#774BBE] hover:bg-purple-50 gap-1.5 transition-colors"
                >
                    <UserPlus size={14} />
                    Ajouter
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden border-slate-200">
                {/* Header Style Pro */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-start gap-4">
                    <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 hidden sm:block">
                        <UserPlus className="w-6 h-6 text-[#774BBE]" />
                    </div>
                    <DialogHeader className="text-left space-y-1">
                        <DialogTitle className="text-xl font-semibold text-slate-800">
                            Inscrire un élève
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 text-sm">
                            Sélectionnez un élève et un appareil pour ce créneau.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-6">
                    {/* Choix Élève */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <UserIcon className="w-3 h-3" /> Qui participe ?
                        </Label>

                        <Select value={studentId} onValueChange={handleStudentChange} disabled={loading}>
                            <SelectTrigger className="w-full bg-slate-50/50 border-slate-200 focus:ring-[#774BBE] focus:border-[#774BBE] transition-all">
                                <SelectValue placeholder="Sélectionner un élève" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                                <SelectItem value=" ">-- Choisir --</SelectItem>
                                {freeStudents.map((item, index) => (
                                    <SelectItem key={index} value={item.id}>
                                        {item.name}
                                    </SelectItem>
                                ))}
                                {(currentUser?.role === userRole.ADMIN || currentUser?.role === userRole.OWNER) && (
                                    <>
                                        <div className="mx-2 my-1 h-px bg-slate-100" />
                                        <SelectItem value="invited" className="text-[#774BBE] font-medium focus:text-[#774BBE]">
                                            + Invité externe
                                        </SelectItem>
                                    </>
                                )}
                            </SelectContent>
                        </Select>

                        {warningStudent && (
                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2.5 rounded-md text-xs border border-amber-100">
                                <AlertCircle size={14} className="shrink-0" /> {warningStudent}
                            </div>
                        )}
                    </div>

                    {/* Formulaire Invité (Conditionnel) */}
                    {studentId === "invited" && (
                        <div className="border-l-2 border-[#774BBE] pl-4 py-1 bg-purple-50/30 rounded-r-lg animate-in slide-in-from-top-2 fade-in duration-300">
                            <InvitedForm
                                invitedStudent={invitedStudent}
                                setInvitedStudent={setInvitedStudent}
                            />
                        </div>
                    )}

                    {/* Choix Avion */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <Plane className="w-3 h-3" /> Sur quel appareil ?
                        </Label>
                        <Select value={planeId} onValueChange={handlePlaneChange} disabled={loading}>
                            <SelectTrigger className="w-full bg-slate-50/50 border-slate-200 focus:ring-[#774BBE] focus:border-[#774BBE] transition-all">
                                <SelectValue placeholder="Sélectionner un appareil" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                                <SelectItem value=" ">-- Choisir --</SelectItem>
                                {freePlanes.map((item, index) => (
                                    <SelectItem key={index} value={item.id}>
                                        {item.name}
                                    </SelectItem>
                                ))}
                                <div className="mx-2 my-1 h-px bg-slate-100" />
                                <SelectItem value="noPlane" className="text-amber-700 focus:text-amber-800">
                                    Sans appareil
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        {warningPlane && (
                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2.5 rounded-md text-xs border border-amber-100">
                                <AlertCircle size={14} className="shrink-0" /> {warningPlane}
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md text-sm border border-red-100">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                <DialogFooter className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 items-center sm:justify-end">
                    <Button
                        variant="ghost"
                        onClick={() => setIsOpen(false)}
                        disabled={loading}
                        className="text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 w-full sm:w-auto"
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={onClickAction}
                        disabled={loading}
                        style={{ backgroundColor: PRIMARY_COLOR }}
                        className="text-white shadow-md hover:opacity-90 transition-opacity w-full sm:w-auto min-w-[120px]"
                    >
                        {loading ? <Spinner className="text-white w-4 h-4" /> : (
                            <div className="flex items-center gap-2">
                                <Check size={16} />
                                <span>Valider</span>
                            </div>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AddStudent;