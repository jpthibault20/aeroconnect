import React, { useState } from 'react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from './ui/select';
import { IoIosWarning } from 'react-icons/io';
import { Button } from './ui/button';
import { requestClubID } from '@/api/db/club';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { Spinner } from './ui/SpinnerVariants';
import { Building2, ArrowRight, PlusCircle } from 'lucide-react';

interface Club {
    id: string;
    name: string;
}

interface props {
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setRequestClubID: React.Dispatch<React.SetStateAction<boolean>>;
    clubs: Club[];
    loading: boolean;
    error: string | null;
    newClubButton: () => void;
    setSelectedClubID: React.Dispatch<React.SetStateAction<string>>;
}

const RequestClubID = ({ setError, clubs, loading, error, newClubButton, setRequestClubID, setSelectedClubID, setLoading }: props) => {
    const { currentUser } = useCurrentUser();
    const [localSelectedId, setLocalSelectedId] = useState<string>("");

    const onSubmit = async () => {
        if (!localSelectedId) {
            setError("Veuillez sélectionner un club.");
            return;
        }

        setLoading(true);
        setSelectedClubID(localSelectedId);

        try {
            const res = await requestClubID(localSelectedId, currentUser!.id);
            if (res.error) {
                console.error(res.error);
                setError(res.error);
            } else {
                setError(null);
                setRequestClubID(true);
            }
        } catch (err) {
            console.error(err);
            setError("Une erreur est survenue.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#774BBE]" />
                    Rechercher votre aéroclub
                </label>

                <Select
                    disabled={loading}
                    onValueChange={(val) => setLocalSelectedId(val)}
                >
                    <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-[#774BBE] h-11 text-slate-800">
                        <SelectValue placeholder="Sélectionnez un club dans la liste..." />
                    </SelectTrigger>

                    {/* CORRECTION ICI : 
                        Ajout de z-[10000] pour passer au-dessus du modal parent qui est en z-[9999] 
                    */}
                    <SelectContent className="max-h-[250px] z-[10000]">
                        {clubs.length > 0 ? (
                            clubs.map((club) => (
                                <SelectItem key={club.id} value={club.id} className="cursor-pointer">
                                    {club.name}
                                </SelectItem>
                            ))
                        ) : (
                            <div className="p-2 text-sm text-slate-500 text-center">Aucun club disponible</div>
                        )}
                    </SelectContent>
                </Select>
            </div>

            {error && (
                <div className="text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg flex items-center gap-2 text-sm">
                    <IoIosWarning className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="pt-2 space-y-4">
                <Button
                    onClick={onSubmit}
                    disabled={loading || !localSelectedId}
                    className="w-full bg-[#774BBE] hover:bg-[#6538a5] text-white h-11 shadow-md transition-all active:scale-95"
                >
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <Spinner className="text-white w-4 h-4" />
                            <span>Envoi en cours...</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span>Rejoindre ce club</span>
                            <ArrowRight className="w-4 h-4" />
                        </div>
                    )}
                </Button>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-slate-400">Ou</span>
                    </div>
                </div>

                <div className="text-center">
                    <button
                        onClick={newClubButton}
                        className="group inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#774BBE] transition-colors"
                    >
                        <PlusCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Je souhaite créer un nouveau club
                    </button>
                </div>
            </div>
        </div>
    );
}

export default RequestClubID;