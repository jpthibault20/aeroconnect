/**
 * @file TableRowComponent.tsx
 * @brief A React component that renders a row in the plane table.
 * 
 * This component represents a single row in the plane table, displaying 
 * the attributes of a plane including its name, registration, and 
 * operational status. It also provides buttons for updating and deleting 
 * the plane.
 * 
 * @param {Object} props - The component properties.
 * @param {Plane} props.plane - The plane object containing its details.
 * 
 * @returns {JSX.Element} The rendered table row component.
 */

import React, { useState } from 'react';
import { TableCell, TableRow } from '../ui/table';
import { planes, userRole } from '@prisma/client';
import { Button } from '../ui/button';
import AlertConfirmDeleted from '../AlertConfirmDeleted';
import { deletePlane, updateOperationalByID } from '@/api/db/planes';
import { toast } from '@/hooks/use-toast';
import { Switch } from '../ui/switch';
import { useCurrentUser } from '@/app/context/useCurrentUser';

interface Props {
    plane: planes; // Utiliser le type Plane ici
    planes: planes[];
    setPlanes: React.Dispatch<React.SetStateAction<planes[]>>;
}

const TableRowComponent = ({ plane, planes, setPlanes }: Props) => {
    const { currentUser } = useCurrentUser()
    const [loading, setLoading] = useState(false);
    const [operational, setOperational] = useState(plane.operational);

    const onClickDeletePlane = () => {
        const removePlane = async () => {
            setLoading(true);
            try {
                const res = await deletePlane(plane.id);
                if (res.success) {
                    // Mise à jour des données locales après suppression
                    setPlanes(planes.filter((p) => p.id !== plane.id));
                    toast({
                        title: "Avion supprimé avec succès",
                    });
                } else if (res.error) {
                    console.error(res.error);
                    toast({
                        title: "Oups, une erreur est survenue",
                    });
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        removePlane();
    };

    const onChangeRestricted = () => {
        const updatePlane = async () => {
            setLoading(true);
            try {
                const res = await updateOperationalByID(plane.id, !operational);
                if (res.success) {
                    // Mise à jour des données locales après modification
                    setPlanes(
                        planes.map((p) =>
                            p.id === plane.id ? { ...p, operational: !operational } : p
                        )
                    );
                    setOperational(!operational);
                    toast({
                        title: "Avion mis à jour avec succès",
                        duration: 3000,
                    });
                } else if (res.error) {
                    console.error(res.error);
                    toast({
                        title: "Oups, une erreur est survenue",
                        duration: 3000,
                    });
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        updatePlane();
    };

    return (
        <TableRow className="text-center">
            <TableCell>{plane.name}</TableCell>
            <TableCell>{plane.immatriculation}</TableCell>
            {currentUser?.role == userRole.STUDENT || currentUser?.role == userRole.PILOT ?
                (<>
                    <TableCell>
                        <div>
                            <Switch checked={operational} onCheckedChange={onChangeRestricted} disabled />
                            <p>{operational ? "Opérationnel" : "En maintenance"}</p>
                        </div>
                    </TableCell>
                </>
                ) : currentUser?.role == userRole.OWNER || currentUser?.role == userRole.ADMIN || currentUser?.role == userRole.INSTRUCTOR ?
                    (
                        <>
                            <TableCell>
                                <div>
                                    <Switch checked={operational} onCheckedChange={onChangeRestricted} />
                                    <p>{operational ? "Opérationnel" : "En maintenance"}</p>
                                </div>
                            </TableCell>
                            <TableCell className="flex flex-col items-center space-y-3 justify-center xl:block xl:space-x-5">
                                <AlertConfirmDeleted
                                    title="Êtes-vous sûr de vouloir supprimer cet avion ?"
                                    description={"Cet avion sera supprimé définitivement."}
                                    cancel="Annuler"
                                    confirm="Supprimer"
                                    confirmAction={onClickDeletePlane}
                                    loading={loading}
                                >
                                    <Button className="w-fit" variant={"destructive"}>
                                        Supprimer
                                    </Button>
                                </AlertConfirmDeleted>
                            </TableCell>
                        </>
                    ) : null}

        </TableRow>
    );
};

export default TableRowComponent;
