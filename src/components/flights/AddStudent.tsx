import React, { useEffect, useState } from 'react'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { addStudentToSession, InvitedStudent } from '@/api/db/users';
import { flight_sessions, planes, User } from '@prisma/client';
import { Button } from '../ui/button';
import { toast } from '@/hooks/use-toast';
import { Spinner } from '../ui/SpinnerVariants';
import { getFreePlanesUsers } from '@/api/popupCalendar';
import { sendNotificationBooking, sendStudentNotificationBooking } from '@/lib/mail';
import { IoIosWarning, IoMdPersonAdd } from 'react-icons/io';
import InvitedForm from './InvitedForm';

interface Props {
    session: flight_sessions;
    sessions: flight_sessions[];
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    planesProp: planes[];
    usersProp: User[]
}

const AddStudent = ({ session, sessions, setSessions, planesProp, usersProp }: Props) => {
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

    // Filtrer les étudiants en fonction de l'avion sélectionné
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

    // Filtrer les avions en fonction de l'étudiant sélectionné
    const filterPlanesByStudent = (studentId: string) => {
        if (session.planeID.includes("classroomSession")) {
            return [{ id: "classroomSession", name: "Session théorique" }];
        }

        const { planes } = getFreePlanesUsers(session, sessions, usersProp, planesProp);
        if (!studentId || studentId === " ") {
            return planes.map(plane => ({ id: plane.id, name: plane.name }));
        }

        const selectedStudent = usersProp.find(user => user.id === studentId);
        if (!selectedStudent) return [];

        const userClasses = selectedStudent.classes || [];
        return planes.filter(plane =>
            userClasses.includes(plane.classes)
        ).map(plane => ({
            id: plane.id,
            name: plane.name
        }));
    };

    // Mise à jour des listes lors de la sélection
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
                // Si on a une session en salle, on commence par ajouter tous les avions normaux
                setFreePlanes([
                    ...planes.map(plane => ({ id: plane.id, name: plane.name })),
                    // Puis on ajoute l'option de session théorique
                    { id: "classroomSession", name: "Session théorique" }
                ]);
            } else {
                // Si pas de session en salle, on n'affiche que les avions normaux
                setFreePlanes(planes.map(plane => ({ id: plane.id, name: plane.name })));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planeId, studentId, session, sessions, usersProp, planesProp]);

    // Mise à jour de l'avion sélectionné si il n'y a qu'un seul
    useEffect(() => {
        if (freePlanes.length === 1) {
            setPlaneId(freePlanes[0].id);
        }
    }, [freePlanes]);

    useEffect(() => {
        if (freeStudents.length === 0) {
            setWarningStudent("l'étudiant n'est pas autorisé pour cet classe d'avion");
        } else {
            setWarningStudent("");
        }
    }, [freeStudents]);

    useEffect(() => {
        if (freePlanes.length === 0) {
            setWarningPlane("Aucun avion n'est disponible pour cette d'étudiant");
        } else {
            setWarningPlane("");
        }
    }, [freePlanes]);

    // Handler pour la sélection d'un étudiant
    const handleStudentChange = (value: string) => {
        setStudentId(value);
        if (value === " ") {
            setPlaneId(" ");
        }
    };

    // Handler pour la sélection d'un avion
    const handlePlaneChange = (value: string) => {
        setPlaneId(value);
        if (value === " ") {
            setStudentId(" ");
        }
    };

    // Reste du code inchangé pour onClickAction...
    const onClickAction = async () => {
        setLoading(true);

        if (studentId) {
            const selectedUser = usersProp.find(user => user.id === studentId);

            if (selectedUser || studentId === 'invited') {

                console.log(
                    session.id,
                    invitedStudent
                )

                try {
                    const res = await addStudentToSession(session.id, {
                        id: studentId,
                        firstName : studentId === 'invited' ? invitedStudent.firstName : selectedUser?.firstName as string,
                        lastName : studentId === 'invited' ? invitedStudent.lastName : selectedUser?.lastName as string,
                        planeId,
                        email :studentId === 'invited' ? invitedStudent.email : usersProp.find(user => user.id === studentId)?.email as string,
                        phone: studentId === 'invited' ? invitedStudent.phone : usersProp.find(user => user.id === studentId)?.phone as string,
                    }, new Date().getTimezoneOffset() as number);

                    if (res.error) {
                        setError(res.error);
                        toast({
                            title: "Oups, une erreur est survenue",
                            description: res.error,
                            duration: 5000,
                            style: {
                                background: '#ab0b0b',
                                color: '#fff',
                            }
                        });
                        setLoading(false);
                    }

                    if (res.success) {
                        toast({
                            title: res.success,
                            duration: 5000,
                            style: {
                                background: '#0bab15',
                                color: '#fff',
                            }
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
                                planeName as string
                            ),
                            sendStudentNotificationBooking(
                                studentId === 'invited' ? invitedStudent.email : selectedUser?.email as string,
                                session.sessionDateStart,
                                endDate,
                                session.clubID,
                                planeName as string
                            ),
                        ]);

                        setSessions(prevSessions => {
                            const updatedSessions = prevSessions.map(s =>
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
                            return updatedSessions;
                        });
                        setStudentId(" ");
                        setPlaneId(" ");
                        setLoading(false);
                    }
                } catch (err) {
                    console.error(err);
                    setError("Une erreur est survenue lors de l'ajout de l'étudiant (E_023: failed to add student)");
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

    return (
        <Dialog>
            <DialogTrigger>
                <IoMdPersonAdd color='green' />
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ajouter un élève</DialogTitle>
                    <DialogDescription>
                        Choisissez l&apos;élève et l&apos;avion que vous souhaitez ajouter à la session
                    </DialogDescription>
                </DialogHeader>

                <Select
                    value={studentId}
                    onValueChange={handleStudentChange}
                    disabled={loading}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Élèves" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value=" ">Élèves</SelectItem>
                        {freeStudents.map((item, index) => (
                            <SelectItem key={index} value={item.id}>
                                {item.name}
                            </SelectItem>
                        ))}
                        <SelectItem value={"invited"}>
                            invité
                        </SelectItem>
                    </SelectContent>
                </Select>

                {/* only for invited */}
                {studentId === "invited" && (
                    <div>
                        <InvitedForm 
                            invitedStudent={invitedStudent}
                            setInvitedStudent={setInvitedStudent}
                        />
                    </div>
                )}

                <Select
                    value={planeId}
                    onValueChange={handlePlaneChange}
                    disabled={loading}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Appareils" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value=" ">Appareils</SelectItem>
                        {freePlanes.map((item, index) => (
                            <SelectItem key={index} value={item.id}>
                                {item.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {warningPlane && <div className="flex items-center text-orange-500 mb-4">
                    <IoIosWarning className="mr-2" size={30} />
                    <span>{warningPlane}</span>
                </div>}

                {warningStudent && <div className="flex items-center text-orange-500 mb-4">
                    <IoIosWarning className="mr-2 " size={30} />
                    <span>{warningStudent}</span>
                </div>}

                {error && (
                    <div className="flex items-center text-destructive mb-4">
                        <IoIosWarning className="mr-2" />
                        <span>{error}</span>
                    </div>
                )}

                <DialogFooter>
                    <DialogClose disabled={loading}>Cancel</DialogClose>
                    {loading ? (
                        <Spinner />
                    ) : (
                        <Button onClick={onClickAction} disabled={loading}>
                            Ajouter
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AddStudent;