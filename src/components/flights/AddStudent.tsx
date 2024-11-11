import React, { useEffect, useState } from 'react'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { FaPlus } from "react-icons/fa6";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { addStudentToSession, getAllUser } from '@/api/db/users';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { User } from '@prisma/client';
import { Button } from '../ui/button';
import { getSessionPlanes } from '@/api/db/sessions';
import { toast } from '@/hooks/use-toast';

interface props {
    sessionID: string;
    reload: boolean;
    setReload: React.Dispatch<React.SetStateAction<boolean>>;
}

const AddStudent = ({ sessionID, reload, setReload }: props) => {
    const { currentUser } = useCurrentUser();
    const [users, setUsers] = useState<User[]>([]);
    const [student, setStudent] = useState<string>(" ");
    const [selectedPlane, setSelectedPlane] = useState<string>(" ");
    const [loading, setLoading] = useState(false);
    const [planes, setPlanes] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        const fetchPlanes = async () => {
            if (sessionID) {
                try {
                    const res = await getSessionPlanes(sessionID);
                    if (Array.isArray(res)) {
                        setPlanes(res);
                    }
                } catch (error) {
                    console.error('Error fetching planes:', error);
                }
            }
        };
        fetchPlanes();
    }, [sessionID])

    useEffect(() => {
        const fetchSessions = async () => {
            if (currentUser) {
                try {
                    const res = await getAllUser(currentUser.clubID);
                    if (Array.isArray(res)) {
                        setUsers(res);
                    }
                } catch (error) {
                    console.error('Error fetching users:', error);
                }
            }
        };
        fetchSessions();
    }, [currentUser]);

    const onClickAction = async () => {
        setLoading(true);
        if (student !== " ") {
            // Chercher l'utilisateur dans le tableau `users` une seule fois
            const selectedUser = users.find(user => user.id === student);

            // Vérifier si l'utilisateur existe avant de continuer
            if (selectedUser) {

                const { firstName, lastName } = selectedUser; // Extraire les propriétés de l'utilisateur trouvé

                try {
                    // Utiliser les données de l'utilisateur trouvé pour l'ajouter à la session
                    const res = await addStudentToSession(sessionID, { id: student, firstName, lastName, planeId: selectedPlane });
                    if (res.error) {
                        toast({
                            title: "Oups, une erreur est survenue",
                            description: res.error,
                        });
                    }
                    if (res.success) {
                        toast({
                            title: res.success,
                        });
                        setReload(!reload);
                        setStudent(" ");
                        setLoading(false);
                    }
                } catch (error) {
                    console.error('Error adding student:', error);
                }
            } else {
                console.error('Student not found');
            }
        } else {
            console.error('Invalid student ID');
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
                {/*  */}
                <Select value={student} onValueChange={(val) => setStudent(val)} disabled={loading}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Elèves" />
                    </SelectTrigger>
                    <SelectContent>
                        {/* Option pour "Tous" les Elèves */}
                        <SelectItem value=" ">Elèves</SelectItem>
                        {users.map((item, index) => (
                            <SelectItem key={index} value={item.id}>
                                {item.firstName} {item.lastName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {/*  */}
                <Select value={selectedPlane} onValueChange={(val) => setSelectedPlane(val)} disabled={loading}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Avions" />
                    </SelectTrigger>
                    <SelectContent>
                        {/* Option pour "Tous" les Avions */}
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
                    <Button onClick={onClickAction} disabled={loading}>Ajouter</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    )
}

export default AddStudent
