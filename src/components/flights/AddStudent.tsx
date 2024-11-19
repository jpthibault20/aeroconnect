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
import { Spinner } from '../ui/SpinnerVariants';

interface Props {
    sessionID: string;
    reload: boolean;
    setReload: React.Dispatch<React.SetStateAction<boolean>>;
}

const AddStudent = ({ sessionID, reload, setReload }: Props) => {
    const { currentUser } = useCurrentUser();
    const [users, setUsers] = useState<User[]>([]);
    const [student, setStudent] = useState<string>(currentUser?.role !== "ADMIN" && currentUser?.role !== "OWNER" && currentUser?.role !== "INSTRUCTOR" ? currentUser?.id || "" : " ");
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
    }, [sessionID]);

    useEffect(() => {
        const fetchUsers = async () => {
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
        fetchUsers();
    }, [currentUser]);

    const onClickAction = async () => {
        setLoading(true);

        // Set `student` to `currentUser.id` if not an admin, owner, or instructor
        const studentId = currentUser?.role !== "ADMIN" && currentUser?.role !== "OWNER" && currentUser?.role !== "INSTRUCTOR"
            ? currentUser?.id
            : student;

        if (studentId) {
            const selectedUser = users.find(user => user.id === studentId);

            if (selectedUser) {
                const { firstName, lastName } = selectedUser;

                try {
                    const res = await addStudentToSession(sessionID, { id: studentId, firstName, lastName, planeId: selectedPlane });
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
                        setSelectedPlane(" ");
                    }
                } catch (error) {
                    console.error('Error adding student:', error);
                } finally {
                    setLoading(false);
                }
            } else {
                console.error('Student not found');
                setLoading(false);
            }
        } else {
            console.error('Invalid student ID');
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
