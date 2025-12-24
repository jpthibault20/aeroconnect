/**
 * @file TableRowComponent.tsx
 * @brief Renders a single row for a plane with modern styling and actions.
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
import { Pencil, Trash2, Plane as PlaneIcon, CheckCircle2, Ban, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    plane: planes;
    planes: planes[];
    setPlanes: React.Dispatch<React.SetStateAction<planes[]>>;
}

const TableRowComponent = ({ plane, planes, setPlanes }: Props) => {
    const { currentUser } = useCurrentUser();
    const [loading, setLoading] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [planeState, setPlaneState] = useState<planes>(plane);

    // --- Permissions Logic ---
    const canManage = currentUser?.role === userRole.OWNER ||
        currentUser?.role === userRole.ADMIN ||
        currentUser?.role === userRole.MANAGER;

    const canViewStatus = canManage ||
        currentUser?.role === userRole.STUDENT ||
        currentUser?.role === userRole.PILOT ||
        currentUser?.role === userRole.INSTRUCTOR;

    // --- Actions ---

    const onClickDeletePlane = async () => {
        setLoading(true);
        try {
            const res = await deletePlane(planeState.id);
            if (res.success) {
                setPlanes(planes.filter((p) => p.id !== planeState.id));
                clearCache(`planes:${planeState.clubID}`);
                toast({
                    title: "Appareil supprimé",
                    description: "L'avion a été retiré de la flotte.",
                    className: "bg-green-600 text-white border-none"
                });
            } else {
                toast({
                    title: "Erreur",
                    description: res.error || "Impossible de supprimer l'avion.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Erreur technique", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const onChangeOperational = async () => {
        // Optimistic UI update (changement visuel immédiat)
        const newState = !planeState.operational;
        setPlaneState(prev => ({ ...prev, operational: newState }));

        setLoading(true);
        try {
            const res = await updateOperationalByID(planeState.id, newState);
            if (res.success) {
                // Update global state
                setPlanes(planes.map((p) => p.id === planeState.id ? { ...p, operational: newState } : p));
                clearCache(`planes:${planeState.clubID}`);
                toast({
                    title: newState ? "Avion opérationnel" : "Avion bloqué",
                    description: `Le statut de ${planeState.name} a été mis à jour.`,
                    className: "bg-slate-800 text-white border-none",
                });
            } else {
                // Revert on error
                setPlaneState(prev => ({ ...prev, operational: !newState }));
                toast({ title: "Erreur lors de la mise à jour", variant: "destructive" });
            }
        } catch (error) {
            setPlaneState(prev => ({ ...prev, operational: !newState }));
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- Render Helpers ---

    const getClasseLabel = () => {
        return aircraftClasses.find(c => c.id === planeState.classes)?.label || "Classe Inconnue";
    };

    const formatHobbsTotal = () => {
        if (!planeState.hobbsTotal) return "0.0h";
        return `${planeState.hobbsTotal.toFixed(1)}h`;
    };

    return (
        <TableRow className="group hover:bg-slate-50 transition-colors">

            {/* 1. Icon Column */}
            <TableCell className="text-center py-4">
                <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-colors",
                    planeState.operational ? "bg-purple-50 text-purple-600" : "bg-red-50 text-red-400"
                )}>
                    <PlaneIcon className="w-4 h-4" />
                </div>
            </TableCell>

            {/* 2. Name Column */}
            <TableCell className="font-medium text-slate-900 pl-4">
                {planeState.name}
            </TableCell>

            {/* 3. Immatriculation Column (Monospace Font) */}
            <TableCell className="text-center">
                <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200">
                    {planeState.immatriculation}
                </span>
            </TableCell>

            {/* 4. Class Column (Hidden on mobile) */}
            <TableCell className="text-center text-slate-500 hidden sm:table-cell">
                <span className="text-xs border border-slate-200 rounded-full px-3 py-0.5">
                    {getClasseLabel()}
                </span>
            </TableCell>

            {/* 5. Hobbs Total Column (NEW - Hidden on mobile) */}
            <TableCell className="text-center hidden md:table-cell">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-mono text-xs font-semibold">
                        {formatHobbsTotal()}
                    </span>
                </div>
            </TableCell>

            {/* 6. Status Column */}
            {canViewStatus && (
                <TableCell className="text-center">
                    {canManage ? (
                        <div className="flex items-center justify-center gap-2">
                            <Switch
                                checked={planeState.operational}
                                onCheckedChange={onChangeOperational}
                                className="data-[state=checked]:bg-green-600"
                            />
                            <span className={cn("text-xs font-medium w-16 text-left", planeState.operational ? "text-green-600" : "text-red-500")}>
                                {planeState.operational ? "En service" : "Bloqué"}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-2">
                            {planeState.operational ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Dispo
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                                    <Ban className="w-3.5 h-3.5" />
                                    Bloqué
                                </span>
                            )}
                        </div>
                    )}
                </TableCell>
            )}

            {/* 7. Actions Column */}
            {canManage && (
                <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1 opacity-100  transition-opacity">

                        {/* Edit Button */}
                        <UpdatePlanes
                            showPopup={showPopup}
                            setShowPopup={setShowPopup}
                            plane={planeState}
                            setPlane={setPlaneState}
                            setPlanes={setPlanes}
                            planes={planes}
                        >
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-purple-600 hover:bg-purple-50">
                                <Pencil className="w-4 h-4" />
                            </Button>
                        </UpdatePlanes>

                        {/* Delete Button */}
                        <AlertConfirmDeleted
                            title={`Supprimer ${planeState.name} ?`}
                            description="Cette action est irréversible. L'avion sera retiré de la base de données."
                            cancel="Annuler"
                            confirm="Supprimer définitivement"
                            confirmAction={onClickDeletePlane}
                            loading={loading}
                        >
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </AlertConfirmDeleted>
                    </div>
                </TableCell>
            )}
        </TableRow>
    );
};

export default TableRowComponent;
