import React, { useEffect, useState } from 'react'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { FaPlus } from "react-icons/fa6";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { addStudentToSession } from '@/api/db/users';
import { flight_sessions, planes, User } from '@prisma/client';
import { Button } from '../ui/button';
import { toast } from '@/hooks/use-toast';
import { Spinner } from '../ui/SpinnerVariants';
import { getFreePlanesUsers } from '@/api/popupCalendar';
import { sendNotificationBooking, sendStudentNotificationBooking } from '@/lib/mail';
import { IoIosWarning } from 'react-icons/io';

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

    // Récupérer les étudiants et les avions disponibles
    useEffect(() => {
        const { students, planes } = getFreePlanesUsers(session, sessions, usersProp, planesProp)

        setFreeStudents(students.map(student => ({ id: student.id, name: `${student.lastName} ${student.firstName}` })));

        if (session.planeID.includes("classroomSession")) {
            setFreePlanes([{ id: "classroomSession", name: "Session théorique" }]);
        }
        else {
            setFreePlanes(planes.map(plane => ({ id: plane.id, name: plane.name })));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planesProp, session, sessions, usersProp])

    // Mise à jour de l'avion sélectionné si il n'y a qu'un seul
    useEffect(() => {
        if (freePlanes.length == 1) {
            setPlaneId(freePlanes[0].id);
        }
    }, [freePlanes])

    // Gestion de l'ajout de l'étudiant
    const onClickAction = async () => {
        setLoading(true);

        if (studentId) {
            const selectedUser = usersProp.find(user => user.id === studentId);

            if (selectedUser) {
                const { firstName, lastName } = selectedUser;

                try {
                    const res = await addStudentToSession(session.id, {
                        id: studentId,
                        firstName,
                        lastName,
                        planeId,
                    }, new Date().getTimezoneOffset() as number);

                    if (res.error) {
                        setError(res.error);
                        toast({
                            title: "Oups, une erreur est survenue",
                            description: res.error,
                            duration: 5000,
                            style: {
                                background: '#ab0b0b', //rouge : ab0b0b
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
                                background: '#0bab15', //rouge : ab0b0b
                                color: '#fff',
                            }
                        });

                        const endDate = new Date(session.sessionDateStart);
                        endDate.setUTCMinutes(endDate.getUTCMinutes() + session.sessionDateDuration_min);
                        const instructor = usersProp.find((user) => user.id === session.pilotID);
                        Promise.all([
                            sendNotificationBooking(
                                instructor?.email || "",
                                selectedUser.firstName,
                                selectedUser.lastName,
                                session.sessionDateStart,
                                endDate,
                                session.clubID
                            ),
                            sendStudentNotificationBooking(
                                selectedUser.email || "",
                                session.sessionDateStart,
                                endDate,
                                session.clubID
                            ),
                        ]);

                        // Mettre à jour la session avec les informations de l'étudiant et l'avion
                        setSessions(prevSessions => {
                            const updatedSessions = prevSessions.map(s =>
                                s.id === session.id
                                    ? {
                                        ...s,
                                        studentID: studentId,  // ID de l'étudiant
                                        studentFirstName: firstName,  // Prénom de l'étudiant
                                        studentLastName: lastName,  // Nom de l'étudiant
                                        studentPlaneID: planeId,  // ID de l'avion
                                    }
                                    : s
                            );
                            return updatedSessions;
                        });
                        // Réinitialiser les champs
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
            <DialogTrigger >
                <FaPlus color='green' />
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ajouter un élève</DialogTitle>
                    <DialogDescription>
                        Voulez-vous ajouter un élève à ce vol ?
                    </DialogDescription>
                </DialogHeader>

                {/* Sélection de l'étudiant */}
                <Select
                    value={studentId}
                    onValueChange={(val) => setStudentId(val)}
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
                    </SelectContent>
                </Select>

                {/* Sélection de l'avion */}
                <Select
                    value={planeId}
                    onValueChange={(val) => setPlaneId(val)}
                    disabled={loading}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder={"Appareils"} />
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
