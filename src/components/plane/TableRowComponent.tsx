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
import { planes } from '@prisma/client';
import { Button } from '../ui/button';
import AlertConfirmDeleted from '../AlertConfirmDeleted';
import { deletePlane, updateOperationalByID } from '@/api/db/planes';
import { toast } from '@/hooks/use-toast';
import { Switch } from '../ui/switch';

interface Props {
    plane: planes; // Utiliser le type Plane ici
    setReload: React.Dispatch<React.SetStateAction<boolean>>;
    reload: boolean;
}

const TableRowComponent = ({ plane, setReload, reload }: Props) => {
    const [loading, setLoading] = useState(false);
    const [operational, setOperational] = useState(plane.operational);

    const onClickDeletePlane = () => {
        const removePlane = async () => {
            setLoading(true);
            try {
                const res = await deletePlane(plane.id);
                if (res.success) {
                    setReload(!reload);
                    setLoading(false);
                    toast({
                        title: "Avion supprimée avec succès",
                        duration: 3000,
                    });
                }
                if (res.error) {
                    console.log(res.error);
                    setLoading(false);
                    toast({
                        title: " Oups, une erreur est survenue",
                        duration: 3000,
                    });
                }
            } catch (error) {
                console.log(error);
            }
        };
        removePlane();
    }

    const onChangeRestricted = () => {
        console.log('onChangeRestricted')
        setOperational(!operational)
        const updatePlane = async () => {
            setLoading(true);
            try {
                const res = await updateOperationalByID(plane.id, !operational);
                if (res.success) {
                    setReload(!reload);
                    setLoading(false);
                    toast({
                        title: "Avion mise à jour avec succès",
                        duration: 3000,
                    });
                }
                if (res.error) {
                    console.log(res.error);
                    setLoading(false);
                    toast({
                        title: " Oups, une erreur est survenue",
                        duration: 3000,
                    });
                }
            } catch (error) {
                console.log(error);
            }
        };
        updatePlane();
    }

    return (
        <TableRow className='text-center'>
            <TableCell>{plane.name}</TableCell>
            <TableCell>{plane.immatriculation}</TableCell>
            <TableCell>
                <div>
                    <Switch checked={operational} onCheckedChange={onChangeRestricted} />
                    <p>
                        {operational ? 'Opérationnel' : 'En maintenance'}
                    </p>
                </div>
            </TableCell>
            <TableCell className='flex flex-col items-center space-y-3 justify-center xl:block xl:space-x-5'>
                <AlertConfirmDeleted
                    title='Etes vous sur de vouloir supprimer cette avion ?'
                    description={'Cette avion sera supprimée définitivement'}
                    // style='flex h-full w-full justify-center items-center'
                    cancel='Annuler'
                    confirm='Supprimer'
                    confirmAction={onClickDeletePlane}
                    loading={loading}
                >
                    <Button className='w-fit' variant={"destructive"}>Supprimer</Button>
                </AlertConfirmDeleted>
            </TableCell>
        </TableRow>
    );
}

export default TableRowComponent;
