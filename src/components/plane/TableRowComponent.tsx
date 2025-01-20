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
import AlertConfirmDeleted from '../AlertConfirmDeleted';
import { deletePlane, updateOperationalByID } from '@/api/db/planes';
import { toast } from '@/hooks/use-toast';
import { Switch } from '../ui/switch';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import UpdatePlanes from './UpdatePlanes';
import { Button } from '../ui/button';
import { clearCache } from '@/lib/cache';
import { aircraftClasses } from '@/config/config';

interface Props {
    plane: planes; // Utiliser le type Plane ici
    planes: planes[];
    setPlanes: React.Dispatch<React.SetStateAction<planes[]>>;
}

const TableRowComponent = ({ plane, planes, setPlanes }: Props) => {
    const { currentUser } = useCurrentUser()
    const [loading, setLoading] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [planeState, setPlaneState] = useState<planes>(plane);



    const onClickDeletePlane = () => {
        const removePlane = async () => {
            setLoading(true);
            try {
                const res = await deletePlane(planeState.id);
                if (res.success) {
                    // Mise à jour des données locales après suppression
                    setPlanes(planes.filter((p) => p.id !== planeState.id));
                    clearCache(`planes:${planeState.clubID}`)
                    toast({
                        title: "Avion supprimé avec succès",
                        duration: 5000,
                        style: {
                            background: '#0bab15', //rouge : ab0b0b
                            color: '#fff',
                        }
                    });
                } else if (res.error) {
                    console.error(res.error);
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
                const res = await updateOperationalByID(planeState.id, !planeState.operational);
                if (res.success) {
                    // Mise à jour des données locales après modification
                    setPlanes(
                        planes.map((p) =>
                            p.id === planeState.id ? { ...p, operational: !planeState.operational } : p
                        )
                    );
                    setPlaneState((prev) => ({ ...prev, operational: !planeState.operational }));
                    clearCache(`planes:${planeState.clubID}`)
                    toast({
                        title: "Avion mis è jour avec succès",
                        duration: 5000,
                        style: {
                            background: '#0bab15', //rouge : ab0b0b
                            color: '#fff',
                        }
                    })
                } else if (res.error) {
                    console.error(res.error);
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
            } finally {
                setLoading(false);
            }
        };
        updatePlane();
        console.log(planeState)
    };

    return (
        <TableRow className="text-center">
            <TableCell>{planeState.name}</TableCell>
            <TableCell>{planeState.immatriculation}</TableCell>
            <TableCell>{aircraftClasses.find(c => c.id === planeState.classes)?.label || "Classe ULM"}</TableCell>
            {currentUser?.role == userRole.STUDENT || currentUser?.role == userRole.PILOT || currentUser?.role == userRole.INSTRUCTOR ?
                (<>
                    <TableCell>
                        <div>
                            <Switch checked={!planeState.operational} onCheckedChange={onChangeRestricted} disabled />
                            <p>{planeState.operational ? "Opérationnel" : "Bloqué"}</p>
                        </div>
                    </TableCell>
                </>
                ) : currentUser?.role == userRole.OWNER || currentUser?.role == userRole.ADMIN ?
                    (
                        <>
                            <TableCell>
                                <div>
                                    <Switch checked={!planeState.operational} onCheckedChange={onChangeRestricted} />
                                    <p>{planeState.operational ? "Opérationnel" : "Bloqué"}</p>
                                </div>
                            </TableCell>
                            <TableCell className="flex-col items-center justify-center space-y-3">
                                <UpdatePlanes
                                    showPopup={showPopup}
                                    setShowPopup={setShowPopup}
                                    plane={planeState}
                                    setPlane={setPlaneState}
                                    setPlanes={setPlanes}
                                    planes={planes}
                                >
                                    <Button className='px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg w-fit'>
                                        Modifier
                                    </Button>
                                </UpdatePlanes>
                                <AlertConfirmDeleted
                                    title="Êtes-vous sûr de vouloir supprimer cet avion ?"
                                    description={"Cet avion sera supprimé définitivement."}
                                    cancel="Annuler"
                                    confirm="Supprimer"
                                    confirmAction={onClickDeletePlane}
                                    loading={loading}
                                >
                                    <div className='px-2 py-1 bg-red-600 text-white rounded-lg'>
                                        Supprimer
                                    </div>
                                </AlertConfirmDeleted>
                            </TableCell>
                        </>
                    ) : null}

        </TableRow>
    );
};

export default TableRowComponent;
