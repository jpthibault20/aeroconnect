/**
 * @file TableRowComponent.tsx
 * @brief This component renders a single row in the user table.
 * It displays user information along with options to update or delete the user.
 * 
 * @details Each row includes the user's picture, name, email, role, restricted status, and phone number.
 * Icons are provided for update and delete actions, which log the respective user IDs to the console when clicked.
 */

import React, { useState } from 'react';
import Image from 'next/image';
import { TableCell, TableRow } from '../ui/table';
import Restricted from './Restricted';
import userPicture from '../../../public/images/userProfil.png';
import { User, userRole } from '@prisma/client';
import AlertConfirmDeleted from '../AlertConfirmDeleted';
import { Button } from '../ui/button';
import { deleteUser } from '@/api/db/users';
import { toast } from '@/hooks/use-toast';
import UpdateUserComponent from './UpdateUserComponent';
import { useCurrentUser } from '@/app/context/useCurrentUser';

interface props {
    user: User;  ///< User object representing the user data to be displayed in this row.
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}


const TableRowComponent = ({ user, setUsers }: props) => {
    const [loading, setLoading] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const { currentUser } = useCurrentUser();

    // Handler for deleting a user; removes the user from the state upon successful deletion.
    const onClickDeleteUser = () => async () => {
        if (user.id === currentUser?.id) {
            toast({
                title: "Vous ne pouvez pas supprimer votre propre compte",
                duration: 5000,
                style: {
                    background: '#ab0b0b', //rouge : ab0b0b
                    color: '#fff',
                }
            });
            return;
        }

        setLoading(true);
        try {
            const res = await deleteUser(user.id);
            if (res.success) {
                // Supprime l'utilisateur localement après une suppression réussie
                setUsers((prevUsers) => prevUsers.filter((u) => u.id !== user.id));
                toast({
                    title: "Utilisateur supprimé avec succès",
                    duration: 5000,
                    style: {
                        background: '#0bab15', //rouge : ab0b0b
                        color: '#fff',
                    }
                });
            } else {
                console.log(res.error);
                toast({
                    title: "Oups, une erreur est survenue",
                    duration: 5000,
                    style: {
                        background: '#ab0b0b', //rouge : ab0b0b
                        color: '#fff',
                    }
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Une erreur s'est produite, impossible de supprimer l'utilisateur pour le moment",
                duration: 5000,
                style: {
                    background: '#ab0b0b', //rouge : ab0b0b
                    color: '#fff',
                }
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <TableRow>
            <TableCell>
                <div className="flex">
                    <Image
                        src={userPicture}
                        alt="User Image"
                        height={50}
                        width={50}
                        className="rounded-full hidden md:flex justify-center"
                        priority
                    />
                    <div className="ml-4 h-full w-full flex flex-col justify-center items-start">
                        <div className="font-medium text-left">
                            {user.lastName.toUpperCase()} {user.firstName}
                        </div>
                        <div className="text-left text-gray-500">{user.email}</div>
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-center">
                {user.role === "USER" && "Visiteur"}
                {user.role === "STUDENT" && "Elève"}
                {user.role === "INSTRUCTOR" && "Instructeur"}
                {user.role === "PILOT" && "Pilote"}
                {user.role === "MANAGER" && "Manager"}
                {user.role === "OWNER" && "Président"}
                {user.role === "ADMIN" && "Administrateur"}
            </TableCell>
            <TableCell className="text-center">
                <Restricted user={user} />
            </TableCell>
            <TableCell className="text-center">{user.phone}</TableCell>
            {currentUser?.role === userRole.ADMIN || currentUser?.role === userRole.OWNER || currentUser?.role === userRole.MANAGER ? (
                <TableCell className="flex flex-col items-center space-y-3 justify-center">
                    <UpdateUserComponent
                        showPopup={showPopup}
                        setShowPopup={setShowPopup}
                        user={user}
                        setUsers={setUsers}
                    >
                        <Button className="w-fit bg-blue-600 hover:bg-blue-700">Modifier</Button>
                    </UpdateUserComponent>

                    <AlertConfirmDeleted
                        title="Êtes-vous sûr de vouloir supprimer cet élève ?"
                        description={`Vous allez supprimer ${user.firstName} ${user.lastName} définitivement.`}
                        cancel="Annuler"
                        confirm="Supprimer"
                        confirmAction={onClickDeleteUser()}
                        loading={loading}
                    >
                        <div className='px-2 py-1 bg-red-600 text-white rounded-lg'>
                            Supprimer
                        </div>
                    </AlertConfirmDeleted>


                </TableCell>
            ) : (
                null
            )
            }
        </TableRow>
    );
};

export default TableRowComponent;
