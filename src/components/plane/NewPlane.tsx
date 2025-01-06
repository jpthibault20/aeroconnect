import { useCurrentUser } from '@/app/context/useCurrentUser';
import React, { useState } from 'react';
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
    const [plane, setPlane] = useState<planes>({
        id: "", // never used
        name: "",
        immatriculation: "",
        clubID: currentUser?.clubID ?? "",
        classes: 3,
        operational: true // never used
    });

    const onSubmit = async () => {
        if (!currentUser) {
            setError("Vous n'êtes pas connecté");
            return;
        }

        try {
            setLoading(true);

            // Mettre à jour l'ID du club
            const planeData = { ...plane, clubID: currentUser.clubID as string };
            const res = await createPlane(planeData);

            if (res.error) {
                setError(res.error);
            } else if (res.success) {
                setError("");
                toast({
                    title: res.success,
                    duration: 5000,
                    style: {
                        background: '#0bab15', //rouge : ab0b0b
                        color: '#fff',
                    }
                });
                setIsOpen(false); // Ferme le dialogue si enregistrement réussi
                setPlanes(res.planes);
                clearCache(`planes:${currentUser.clubID}`)
            } else {
                setError("Une erreur est survenue (E_002: res.error is undefined)");
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
            <DialogTrigger
                className="bg-[#774BBE] hover:bg-[#3d2365] text-white text-xl h-full rounded-md py-1 px-2 font-medium flex justify-center items-center"
                onClick={() => setIsOpen(true)}
            >
                Ajouter un avion
            </DialogTrigger>
            <DialogContent className="bg-[#ffffff] max-h-screen overflow-y-auto w-full lg:max-w-[600px] p-4 sm:p-6">
                <DialogHeader className="flex flex-col items-center mb-3">
                    <DialogTitle>Ajout d&apos;un avion</DialogTitle>
                    <DialogDescription>Configuration de l&apos;avion</DialogDescription>
                </DialogHeader>

                {/* Champ Nom */}
                <div className="mb-4">
                    <Label htmlFor="name">Nom</Label>
                    <Input
                        id="name"
                        placeholder="Nom de l'avion"
                        disabled={loading}
                        value={plane.name}
                        onChange={(e) => setPlane((prev) => ({ ...prev, name: e.target.value }))}
                    />
                </div>

                {/* Champ Immatriculation */}
                <div className="mb-4">
                    <Label htmlFor="immatriculation">Immatriculation</Label>
                    <Input
                        id="immatriculation"
                        placeholder="X-XXXXX"
                        disabled={loading}
                        value={plane.immatriculation}
                        onChange={(e) => setPlane((prev) => ({ ...prev, immatriculation: e.target.value }))}
                    />
                </div>

                <div>
                    <DropDownClasse
                        planeProp={plane}
                        setPlaneProp={setPlane}
                    />
                </div>

                {error && (
                    <div className="text-red-500 w-full p-2 bg-[#FFF4F4] rounded-lg flex items-center space-x-2">
                        <IoIosWarning size={20} />
                        <div>{error}</div>
                    </div>
                )}

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={loading}>
                        Annuler
                    </Button>
                    {loading ? (
                        <Spinner />
                    ) : (
                        <Button onClick={onSubmit} disabled={loading}>
                            Enregistrer
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NewPlane;
