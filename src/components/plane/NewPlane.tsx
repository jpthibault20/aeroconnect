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
import { IoMdAdd } from 'react-icons/io'; // Ou PlusIcon de lucide-react
import { Plane } from 'lucide-react'; // Icône pour le header
import { planes } from '@prisma/client';
import { DropDownClasse } from './DropDownClasse';
import { clearCache } from '@/lib/cache';

interface Props {
    setPlanes: React.Dispatch<React.SetStateAction<planes[]>>;
}

const NewPlane = ({ setPlanes }: Props) => {
    const { currentUser } = useCurrentUser();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const initialPlaneState = {
        id: "",
        name: "",
        immatriculation: "",
        clubID: currentUser?.clubID ?? "",
        classes: 3,
        operational: true
    };

    const [plane, setPlane] = useState<planes>(initialPlaneState);

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
            const planeData = { ...plane, clubID: currentUser.clubID as string };
            const res = await createPlane(planeData);

            if (res.error) {
                setError(res.error);
            } else if (res.success) {
                setError("");
                toast({
                    title: "Succès",
                    description: res.success,
                    className: "bg-green-600 text-white border-none",
                });
                setIsOpen(false);
                setPlanes(res.planes);
                clearCache(`planes:${currentUser.clubID}`);
                setPlane(initialPlaneState);
            } else {
                setError("Une erreur inconnue est survenue.");
            }
        } catch (error) {
            console.error(error);
            setError("Une erreur est survenue lors de l'envoi des données.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#774BBE] hover:bg-[#6538a5] text-white shadow-md gap-2 transition-colors">
                    <IoMdAdd className="w-5 h-5" />
                    Ajouter un avion
                </Button>
            </DialogTrigger>

            {/* Structure identique à NewSession: p-0 gap-0 pour gérer le layout manuellement */}
            <DialogContent className="w-[95%] sm:max-w-[500px] max-h-[85vh] p-0 gap-0 bg-white rounded-xl sm:rounded-2xl border-none shadow-2xl flex flex-col">

                {/* --- Header Fixe (Gris) --- */}
                <div className="bg-slate-50 p-4 sm:p-6 border-b border-slate-100 flex-shrink-0 rounded-t-xl sm:rounded-t-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
                            {/* Icône encadrée comme dans NewSession */}
                            <div className="p-2 bg-[#774BBE]/10 rounded-lg">
                                <Plane className="w-5 h-5 sm:w-6 sm:h-6 text-[#774BBE]" />
                            </div>
                            Nouvel appareil
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 ml-11 text-xs sm:text-sm">
                            Ajoutez un avion à la flotte du club.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* --- Corps Scrollable --- */}
                <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-grow">

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
                            {/* Assure-toi que DropDownClasse a un style cohérent (w-full, border-slate-200, etc.) */}
                            <DropDownClasse
                                planeProp={plane}
                                setPlaneProp={setPlane}
                            />
                        </div>
                    </div>
                </div>

                {/* --- Footer Fixe (Gris) --- */}
                <div className="bg-slate-50 p-4 sm:p-6 border-t border-slate-100 flex flex-col gap-4 flex-shrink-0 rounded-b-xl sm:rounded-b-2xl">
                    {/* Gestion des erreurs style Alert */}
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