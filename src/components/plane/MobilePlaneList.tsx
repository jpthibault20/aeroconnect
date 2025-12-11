import React, { useState } from 'react';
import { planes, userRole } from '@prisma/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { deletePlane, updateOperationalByID } from '@/api/db/planes';
import { toast } from '@/hooks/use-toast';
import AlertConfirmDeleted from '../AlertConfirmDeleted';
import UpdatePlanes from './UpdatePlanes'; // Ton composant d'édition
import { Switch } from '@/components/ui/switch';
import { clearCache } from '@/lib/cache';
import { aircraftClasses } from '@/config/config';
import { Plane as PlaneIcon, Trash2, Pencil, CheckCircle2, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    planesList: planes[];
    setPlanes: React.Dispatch<React.SetStateAction<planes[]>>;
}

const MobilePlaneList = ({ planesList, setPlanes }: Props) => {
    if (planesList.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-slate-200 shadow-sm mt-4">
                <PlaneIcon className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-slate-500 font-medium">Aucun avion dans la flotte.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 pb-20">
            {planesList.map((plane) => (
                // On délègue le rendu à un sous-composant pour isoler l'état (loading, operational...) de chaque avion
                <MobilePlaneCard
                    key={plane.id}
                    initialPlane={plane}
                    setPlanes={setPlanes}
                    allPlanes={planesList}
                />
            ))}
        </div>
    );
};

// --- SOUS-COMPOSANT : CARTE INDIVIDUELLE ---
// Il contient toute la logique métier (Delete, Update Status) copiée de TableRowComponent
interface CardProps {
    initialPlane: planes;
    setPlanes: React.Dispatch<React.SetStateAction<planes[]>>;
    allPlanes: planes[];
}

const MobilePlaneCard = ({ initialPlane, setPlanes, allPlanes }: CardProps) => {
    const { currentUser } = useCurrentUser();
    const [loading, setLoading] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [planeState, setPlaneState] = useState<planes>(initialPlane);

    // --- Permissions (Identiques au Tableau) ---
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
                setPlanes(prev => prev.filter((p) => p.id !== planeState.id));
                clearCache(`planes:${planeState.clubID}`);
                toast({
                    title: "Appareil supprimé",
                    className: "bg-green-600 text-white border-none"
                });
            } else {
                toast({ title: "Erreur", description: res.error, variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Erreur technique", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const onChangeOperational = async () => {
        const newState = !planeState.operational;
        // Optimistic Update
        setPlaneState(prev => ({ ...prev, operational: newState }));

        setLoading(true);
        try {
            const res = await updateOperationalByID(planeState.id, newState);
            if (res.success) {
                // Update global list
                setPlanes(prev => prev.map((p) => p.id === planeState.id ? { ...p, operational: newState } : p));
                clearCache(`planes:${planeState.clubID}`);
                toast({
                    title: newState ? "Avion opérationnel" : "Avion bloqué",
                    description: `Statut mis à jour pour ${planeState.name}`,
                    className: "bg-slate-800 text-white border-none",
                });
            } else {
                // Revert
                setPlaneState(prev => ({ ...prev, operational: !newState }));
                toast({ title: "Erreur", variant: "destructive" });
            }
        } catch (error) {
            setPlaneState(prev => ({ ...prev, operational: !newState }));
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getClasseLabel = () => {
        return aircraftClasses.find(c => c.id === planeState.classes)?.label || "Classe Inconnue";
    };

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardContent className="p-4 space-y-4">

                {/* Header: Icon, Name, Immat */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        {/* Icone dynamique selon statut */}
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors border",
                            planeState.operational
                                ? "bg-purple-50 text-[#774BBE] border-purple-100"
                                : "bg-red-50 text-red-500 border-red-100"
                        )}>
                            <PlaneIcon className="w-6 h-6" />
                        </div>

                        <div>
                            <h3 className="font-bold text-lg text-slate-900 leading-tight">
                                {planeState.name}
                            </h3>
                            <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 mt-1 inline-block">
                                {planeState.immatriculation}
                            </span>
                        </div>
                    </div>

                    {/* Badge de Classe (En haut à droite) */}
                    <span className="text-[10px] uppercase font-bold text-slate-400 border border-slate-100 px-2 py-1 rounded-full">
                        {getClasseLabel()}
                    </span>
                </div>

                {/* Status Switch (Pour Manager) ou Badge (Pour User) */}
                {canViewStatus && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">État de l&apos;appareil</span>

                        {canManage ? (
                            <div className="flex items-center gap-3">
                                <span className={cn("text-xs font-medium", planeState.operational ? "text-green-600" : "text-red-500")}>
                                    {planeState.operational ? "En service" : "Bloqué"}
                                </span>
                                <Switch
                                    checked={planeState.operational}
                                    onCheckedChange={onChangeOperational}
                                    className="data-[state=checked]:bg-green-600"
                                    disabled={loading}
                                />
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                {planeState.operational ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                        <CheckCircle2 className="w-3 h-3" /> Dispo
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-full">
                                        <Ban className="w-3 h-3" /> Bloqué
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Actions Footer */}
                {canManage && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                        {/* Edit Button */}
                        <UpdatePlanes
                            showPopup={showPopup}
                            setShowPopup={setShowPopup}
                            plane={planeState}
                            setPlane={setPlaneState}
                            setPlanes={setPlanes}
                            planes={allPlanes}
                        >
                            <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-[#774BBE] hover:border-purple-200">
                                <Pencil className="w-4 h-4 mr-2" />
                                Modifier
                            </Button>
                        </UpdatePlanes>

                        {/* Delete Button */}
                        <AlertConfirmDeleted
                            title={`Supprimer ${planeState.name} ?`}
                            description="Cette action est irréversible."
                            cancel="Annuler"
                            confirm="Supprimer"
                            confirmAction={onClickDeletePlane}
                            loading={loading}
                            style="w-full"
                        >
                            <Button variant="outline" className="w-full border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                            </Button>
                        </AlertConfirmDeleted>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default MobilePlaneList;