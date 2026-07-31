'use client'

import React, { useState } from 'react';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Spinner } from '../ui/SpinnerVariants';
import { createPlane } from '@/api/db/planes';
import { toast } from '@/hooks/use-toast';
import { IoIosWarning } from 'react-icons/io';
import { IoMdAdd } from 'react-icons/io';
import { Plane, Lock, Users } from 'lucide-react';
import { planes, userRole } from '@prisma/client';
import { DropDownClasse } from './DropDownClasse';
import { clearCache } from '@/lib/cache';
import { CLUB_PLANE_MANAGE_ROLES, CLUB_USAGE_VALUES } from '@/lib/planeVisibility';
import { cn } from '@/lib/utils';

interface Props {
    setPlanes: React.Dispatch<React.SetStateAction<planes[]>>;
}

const NewPlane = ({ setPlanes }: Props) => {
    const { currentUser } = useCurrentUser();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Seuls les rôles de gestion peuvent créer une machine DU CLUB. Les autres
    // membres (STUDENT/PILOT/INSTRUCTOR) ne créent que des machines privées.
    const isManagement = !!currentUser && CLUB_PLANE_MANAGE_ROLES.includes(currentUser.role);

    const initialPlaneState: planes = {
        id: "",
        name: "",
        immatriculation: "",
        clubID: currentUser?.clubID ?? "",
        classes: 3,
        operational: true,
        hobbsTotal: null,
        ownerID: null,
        usageTypes: [],
        maintenanceHistory: null,
        // La photo s'ajoute depuis la fiche de modification, une fois la
        // machine créée (avant, elle n'a pas d'id, donc pas de chemin de
        // stockage possible).
        imagePath: null,
    };

    const [plane, setPlane] = useState<planes>(initialPlaneState);
    // 'club' = machine du club (gestionnaires) ; 'private' = machine perso.
    const [kind, setKind] = useState<"club" | "private">(isManagement ? "club" : "private");

    const resetForm = () => {
        setPlane(initialPlaneState);
        setKind(isManagement ? "club" : "private");
        setError("");
    };

    const onSubmit = async () => {
        if (!currentUser) {
            setError("Vous n'êtes pas connecté");
            return;
        }

        if (!plane.name || !plane.immatriculation) {
            setError("Veuillez remplir les champs obligatoires");
            return;
        }

        try {
            setLoading(true);
            const res = await createPlane({
                clubID: currentUser.clubID as string,
                name: plane.name,
                immatriculation: plane.immatriculation,
                classes: plane.classes,
                kind,
                // Le choix des usages n'est pas exposé pour l'instant : une
                // machine du club est créée avec tous les usages (le serveur en
                // exige au moins un). Le jour où le champ revient dans le
                // formulaire, il suffit de repasser la sélection de l'utilisateur.
                usageTypes: kind === "club" ? CLUB_USAGE_VALUES : [],
            });

            if (res.error) {
                setError(res.error);
            } else if (res.success) {
                toast({
                    title: "Succès",
                    description: res.success,
                    className: "bg-green-600 text-white border-none",
                });
                setIsOpen(false);
                setPlanes(res.planes);
                clearCache(`planes:${currentUser.clubID}`);
                resetForm();
            } else {
                setError("Une erreur inconnue est survenue.");
            }
        } catch {
            setError("Une erreur est survenue lors de l'envoi des données.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
                <Button className="bg-[#774BBE] hover:bg-[#6538a5] text-white shadow-md gap-2 transition-colors">
                    <IoMdAdd className="w-5 h-5" />
                    Ajouter un avion
                </Button>
            </DialogTrigger>

            <DialogContent className="w-[95%] sm:max-w-[500px] max-h-[85vh] p-0 gap-0 bg-white rounded-xl sm:rounded-2xl border-none shadow-2xl flex flex-col">

                {/* --- Header Fixe (Gris) --- */}
                <div className="bg-slate-50 p-4 sm:p-6 border-b border-slate-100 flex-shrink-0 rounded-t-xl sm:rounded-t-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <div className="p-2 bg-[#774BBE]/10 rounded-lg">
                                <Plane className="w-5 h-5 sm:w-6 sm:h-6 text-[#774BBE]" />
                            </div>
                            Nouvel appareil
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 ml-11 text-xs sm:text-sm">
                            {isManagement
                                ? "Ajoutez une machine du club ou une machine privée."
                                : "Ajoutez votre machine privée pour le suivi de son carnet."}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* --- Corps Scrollable --- */}
                <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-grow">

                    {/* Section 0: Type de machine (seulement pour les gestionnaires) */}
                    {isManagement && (
                        <div className="space-y-4">
                            <h3 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Type de machine
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setKind("club")}
                                    className={cn(
                                        "flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors",
                                        kind === "club"
                                            ? "border-[#774BBE] bg-[#774BBE]/5 text-[#774BBE] font-medium"
                                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <Users className="w-4 h-4" />
                                    Machine du club
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setKind("private")}
                                    className={cn(
                                        "flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors",
                                        kind === "private"
                                            ? "border-amber-500 bg-amber-50 text-amber-700 font-medium"
                                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <Lock className="w-4 h-4" />
                                    Machine privée
                                </button>
                            </div>
                        </div>
                    )}

                    {!isManagement && (
                        <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-md text-sm border border-amber-100">
                            <Lock className="w-4 h-4 flex-shrink-0" />
                            <span>Machine privée : visible uniquement par vous, le président et l&apos;admin.</span>
                        </div>
                    )}

                    {/* Section 1: Identification */}
                    <div className="space-y-4">
                        <h3 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Identification
                        </h3>

                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-slate-600 text-sm font-medium">Nom de l&apos;appareil</Label>
                                <Input
                                    id="name"
                                    placeholder="Ex: Robin DR400"
                                    className="bg-slate-50 border-slate-200 focus:ring-[#774BBE] focus:border-[#774BBE]"
                                    disabled={loading}
                                    value={plane.name}
                                    onChange={(e) => setPlane((prev) => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="immatriculation" className="text-slate-600 text-sm font-medium">Immatriculation</Label>
                                <Input
                                    id="immatriculation"
                                    placeholder="Ex: F-GXXX"
                                    className="bg-slate-50 border-slate-200 focus:ring-[#774BBE] focus:border-[#774BBE] uppercase placeholder:normal-case"
                                    disabled={loading}
                                    value={plane.immatriculation}
                                    onChange={(e) => setPlane((prev) => ({ ...prev, immatriculation: e.target.value.toUpperCase() }))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* Section 2: Technique */}
                    <div className="space-y-4">
                        <h3 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Technique
                        </h3>
                        <div className="space-y-2">
                            <Label className="text-slate-600 text-sm font-medium">Classe de l&apos;appareil</Label>
                            <DropDownClasse
                                planeProp={plane}
                                setPlaneProp={setPlane}
                            />
                        </div>
                    </div>
                </div>

                {/* --- Footer Fixe (Gris) --- */}
                <div className="bg-slate-50 p-4 sm:p-6 border-t border-slate-100 flex flex-col gap-4 flex-shrink-0 rounded-b-xl sm:rounded-b-2xl">
                    {error && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md text-sm border border-red-100">
                            <IoIosWarning className="w-5 h-5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-row justify-end gap-3 sm:gap-0">
                        <Button
                            variant="ghost"
                            onClick={() => setIsOpen(false)}
                            disabled={loading}
                            className="text-slate-500 hover:text-slate-700 hover:bg-slate-200 w-full sm:w-auto"
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={onSubmit}
                            disabled={loading}
                            className="bg-[#774BBE] hover:bg-[#6538a5] text-white w-full sm:min-w-[140px] sm:w-auto"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2 justify-center">
                                    <Spinner className="text-white w-4 h-4" />
                                    <span>Enregistrement...</span>
                                </div>
                            ) : (
                                "Enregistrer l'avion"
                            )}
                        </Button>
                    </DialogFooter>
                </div>

            </DialogContent>
        </Dialog>
    );
};

export default NewPlane;
