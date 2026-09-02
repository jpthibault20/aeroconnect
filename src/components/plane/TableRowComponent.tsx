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
import { Pencil, Trash2, CheckCircle2, Ban, Lock, Wrench, AlertTriangle, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { canManagePlane, canAccessMaintenance, isPrivatePlane } from '@/lib/planeVisibility';
import { canManageBaptemeOptions } from '@/lib/bapteme';
import MaintenanceDialog from './maintenance/MaintenanceDialog';
import BaptemeOptionsDialog from './bapteme/BaptemeOptionsDialog';
import PlaneThumbnail from './PlaneThumbnail';

interface Props {
    plane: planes;
    planes: planes[];
    setPlanes: React.Dispatch<React.SetStateAction<planes[]>>;
    // Affichage de la colonne "Propriétaire" (président/admin uniquement).
    canViewOwner?: boolean;
    ownerNames?: Record<string, string>;
    onOwnerNameResolved?: (ownerID: string, ownerName: string) => void;
    // Au moins un rappel de maintenance en retard sur cette machine.
    isOverdue?: boolean;
}

const TableRowComponent = ({ plane, planes, setPlanes, canViewOwner, ownerNames, onOwnerNameResolved, isOverdue }: Props) => {
    const { currentUser } = useCurrentUser();
    const [loading, setLoading] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [showMaintenance, setShowMaintenance] = useState(false);
    const [showBapteme, setShowBapteme] = useState(false);
    const [planeState, setPlaneState] = useState<planes>(plane);

    // --- Permissions Logic ---
    // Gestion par machine : rôles de gestion sur les machines du club ;
    // propriétaire (+ président/admin) sur une machine privée.
    const canManage = currentUser
        ? canManagePlane(planeState, currentUser)
        : false;

    // Accès au suivi de maintenance (plus large que la gestion : un instructeur
    // voit la maintenance des machines club sans pouvoir gérer l'avion).
    const canMaintenance = currentUser
        ? canAccessMaintenance(planeState, currentUser)
        : false;

    // Config des formules de baptême (durée + tarif) : rôles de gestion,
    // uniquement sur une machine du club.
    const canBapteme = currentUser
        ? canManageBaptemeOptions(planeState, currentUser)
        : false;

    const canViewStatus = canManage ||
        currentUser?.role === userRole.OWNER ||
        currentUser?.role === userRole.ADMIN ||
        currentUser?.role === userRole.MANAGER ||
        currentUser?.role === userRole.STUDENT ||
        currentUser?.role === userRole.PILOT ||
        currentUser?.role === userRole.INSTRUCTOR;

    const isPrivate = isPrivatePlane(planeState);

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
        } finally {
            setLoading(false);
        }
    };

    // --- Render Helpers ---

    const getClasseLabel = () => {
        return aircraftClasses.find(c => c.id === planeState.classes)?.label || "Classe Inconnue";
    };

    return (
        <TableRow className={cn(
            "group transition-colors",
            isOverdue ? "bg-red-50/50 hover:bg-red-50" : "hover:bg-slate-50"
        )}>

            {/* 1. Icon Column — photo de la machine, ou icône en repli */}
            <TableCell className="text-center py-4">
                <PlaneThumbnail
                    imagePath={planeState.imagePath}
                    name={planeState.name}
                    sizes="40px"
                    iconClassName="w-4 h-4"
                    className={cn(
                        "w-10 h-10 rounded-lg mx-auto transition-colors",
                        planeState.operational ? "bg-purple-50 text-purple-600" : "bg-red-50 text-red-400"
                    )}
                />
            </TableCell>

            {/* 2. Name Column */}
            <TableCell className="font-medium text-slate-900 pl-4">
                <div className="flex flex-col gap-1">
                    <span>{planeState.name}</span>
                    <div className="flex flex-wrap items-center gap-1">
                        {isOverdue && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200 rounded-full px-2 py-0.5">
                                <AlertTriangle className="w-3 h-3" />
                                Révision en retard
                            </span>
                        )}
                        {/* Les usages (instruction / location / club) ne sont plus
                            affichés : le champ n'est pas encore exploité par une
                            règle métier. */}
                        {isPrivate && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                                <Lock className="w-3 h-3" />
                                Privé
                            </span>
                        )}
                    </div>
                </div>
            </TableCell>

            {/* 3. Propriétaire Column (président/admin uniquement) */}
            {canViewOwner && (
                <TableCell className="pl-4 text-slate-600">
                    {isPrivate ? (
                        <span className="text-sm">
                            {(planeState.ownerID && ownerNames?.[planeState.ownerID]) || "—"}
                        </span>
                    ) : (
                        <span className="text-xs text-slate-400">Club</span>
                    )}
                </TableCell>
            )}

            {/* 4. Immatriculation Column (Monospace Font) */}
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

            {/* 5. Heures moteur Column (Hidden on mobile) */}
            <TableCell className="text-center text-slate-500 hidden sm:table-cell">
                <span className="text-xs font-mono">
                    {planeState.hobbsTotal != null ? `${planeState.hobbsTotal}h` : "—"}
                </span>
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

            {/* 6. Actions Column */}
            {(canManage || canMaintenance || canBapteme) && (
                <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1 opacity-100  transition-opacity">

                        {/* Maintenance Button */}
                        {canMaintenance && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowMaintenance(true)}
                                className={cn(
                                    "h-8 w-8",
                                    isOverdue
                                        ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                                        : "text-slate-500 hover:text-[#774BBE] hover:bg-purple-50"
                                )}
                                title={isOverdue ? "Maintenance — révision en retard" : "Maintenance"}
                            >
                                <Wrench className="w-4 h-4" />
                            </Button>
                        )}

                        {/* Config baptême (durées + tarifs) Button */}
                        {canBapteme && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowBapteme(true)}
                                className="h-8 w-8 text-slate-500 hover:text-[#774BBE] hover:bg-purple-50"
                                title="Formules de baptême"
                            >
                                <Ticket className="w-4 h-4" />
                            </Button>
                        )}

                        {canManage && (
                            <>
                                {/* Edit Button */}
                                <UpdatePlanes
                                    showPopup={showPopup}
                                    setShowPopup={setShowPopup}
                                    plane={planeState}
                                    setPlane={setPlaneState}
                                    setPlanes={setPlanes}
                                    planes={planes}
                                    onOwnerNameResolved={onOwnerNameResolved}
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
                            </>
                        )}
                    </div>
                </TableCell>
            )}

            {canMaintenance && (
                <MaintenanceDialog
                    plane={planeState}
                    open={showMaintenance}
                    onOpenChange={setShowMaintenance}
                />
            )}

            {canBapteme && (
                <BaptemeOptionsDialog
                    plane={planeState}
                    open={showBapteme}
                    onOpenChange={setShowBapteme}
                />
            )}
        </TableRow>
    );
};

export default TableRowComponent;