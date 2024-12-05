import React, { useEffect, useState } from 'react'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { FaPlus } from "react-icons/fa6";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { addStudentToSession, getAllUser } from '@/api/db/users';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { flight_sessions, planes, User, userRole } from '@prisma/client';
import { Button } from '../ui/button';
import { toast } from '@/hooks/use-toast';
import { Spinner } from '../ui/SpinnerVariants';
import { getFreePlanesUsers } from '@/api/popupCalendar';

interface Props {
    session: flight_sessions;
    sessions: flight_sessions[];
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    planesProp: planes[];
}

const AddStudent = ({ session, sessions, setSessions, planesProp }: Props) => {
    const { currentUser } = useCurrentUser();
    const [users, setUsers] = useState<User[]>([]);
    const [student, setStudent] = useState<string>(currentUser?.role !== "ADMIN" && currentUser?.role !== "OWNER" && currentUser?.role !== "INSTRUCTOR" ? currentUser?.id || "" : " ");
    const [selectedPlane, setSelectedPlane] = useState<string>(" ");
    const [loading, setLoading] = useState(false);
    const [planes, setPlanes] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        if (session?.planeID) {
            // Filtrer les avions correspondant aux IDs contenus dans session.planeID
            const updatedPlanes = planesProp.filter(plane =>
                Array.isArray(session.planeID)
                    ? session.planeID.includes(plane.id) // Si planeID est un tableau d'IDs
                    : session.planeID === plane.id     // Si planeID est un ID unique
            );
            setPlanes(updatedPlanes); // Met à jour l'état planes
        }
    }, [session, planesProp]);


    useEffect(() => {
        const fetchUsers = async () => {
            if (currentUser) {
                try {
                    const res = await getAllUser(currentUser.clubID as string);
                    if (Array.isArray(res)) {
                        setUsers(res);
                    }
                } catch (error) {
                    console.error('Error fetching users:', error);
                }
            }
        };
        fetchUsers();
    }, [currentUser]);

    useEffect(() => {
        const fetchPlanesAndUsers = async () => {
            try {
                const { students: studentRes, planes: planesRes } = await getFreePlanesUsers(session, sessions);

                // Mettre à jour les états ou utiliser les données
                setUsers(studentRes || []); // Exemple : mettre à jour les instructeurs disponibles
                setPlanes(planesRes);
            } catch (error) {
                console.error('Error fetching planes and users:', error);
            }
        };

        fetchPlanesAndUsers();
    }, [sessions, session]);

    if (currentUser?.role === userRole.USER) return null;

    const onClickAction = async () => {
        setLoading(true);

        // Détermine l'ID de l'étudiant à ajouter
        const studentId =
            currentUser?.role !== "ADMIN" &&
                currentUser?.role !== "OWNER" &&
                currentUser?.role !== "INSTRUCTOR"
                ? currentUser?.id
                : student;

        if (studentId) {
            const selectedUser = users.find(user => user.id === studentId);

            if (selectedUser) {
                const { firstName, lastName } = selectedUser;

                try {
                    const res = await addStudentToSession(session.id, {
                        id: studentId,
                        firstName,
                        lastName,
                        planeId: selectedPlane,
                    });

                    if (res.error) {
                        toast({
                            title: "Oups, une erreur est survenue",
                            description: res.error,
                            duration: 5000,
                        });
                    }

                    if (res.success) {
                        toast({
                            title: res.success,
                            duration: 5000,
                        });

                        // Mettre à jour la session avec les informations de l'étudiant et l'avion
                        setSessions(prevSessions => {
                            const updatedSessions = prevSessions.map(s =>
                                s.id === session.id
                                    ? {
                                        ...s,
                                        studentID: studentId,  // ID de l'étudiant
                                        studentFirstName: firstName,  // Prénom de l'étudiant
                                        studentLastName: lastName,  // Nom de l'étudiant
                                        studentPlaneID: selectedPlane,  // ID de l'avion
                                    }
                                    : s
                            );
                            return updatedSessions;
                        });
                        // Réinitialiser les champs
                        setStudent(" ");
                        setSelectedPlane(" ");
                    }
                } catch (error) {
                    console.error("Error adding student:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                console.error("Student not found");
                setLoading(false);
            }
        } else {
            console.error("Invalid student ID");
            setLoading(false);
        }
    };


    return (
        <Dialog>
            <DialogTrigger >
                {currentUser?.role === "ADMIN" || currentUser?.role === "OWNER" || currentUser?.role === "INSTRUCTOR" ? (
                    <FaPlus color='green' />
                ) : (
                    <div className='bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-lg'>
                        S&apos;inscrire
                    </div>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ajouter un élève</DialogTitle>
                    <DialogDescription>
                        Voulez-vous ajouter un élève à ce vol ?
                    </DialogDescription>
                </DialogHeader>
                <Select
                    value={currentUser?.role === "ADMIN" || currentUser?.role === "OWNER" || currentUser?.role === "INSTRUCTOR" ? student : currentUser?.id}
                    onValueChange={(val) => setStudent(val)}
                    disabled={currentUser?.role !== "ADMIN" && currentUser?.role !== "OWNER" && currentUser?.role !== "INSTRUCTOR"}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Élèves" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value=" ">Élèves</SelectItem>
                        {users.map((item, index) => (
                            <SelectItem key={index} value={item.id}>
                                {item.firstName} {item.lastName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={selectedPlane} onValueChange={(val) => setSelectedPlane(val)} disabled={loading}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Avions" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value=" ">Avions</SelectItem>
                        {planes.map((item, index) => (
                            <SelectItem key={index} value={item.id}>
                                {item.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <DialogFooter>
                    <DialogClose>Cancel</DialogClose>
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
