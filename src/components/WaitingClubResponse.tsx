import { getClub } from "@/api/db/club";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { Club } from "@prisma/client";
import { useEffect, useState } from "react";
import { Spinner } from "./ui/SpinnerVariants";
import { Timer, AlertCircle, Mail } from "lucide-react";

interface props {
    clubIDprops: string
}

const WaitingClubResponse = ({ clubIDprops }: props) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [club, setClub] = useState<Club>();
    const { currentUser } = useCurrentUser();

    const fetchClub = async () => {
        setLoading(true);
        setError(null);

        try {
            // On récupère l'ID du club demandé (soit dans le profil user, soit dans les props)
            const targetClubID = currentUser?.clubIDRequest || clubIDprops;

            if (!targetClubID) {
                setError("Identifiant de club introuvable.");
                return;
            }

            const fetchedClub = await getClub(targetClubID);
            if (fetchedClub) {
                setClub(fetchedClub);
            } else {
                setError("Le club demandé est introuvable.");
            }
        } catch (err) {
            console.error("Erreur API:", err);
            setError("Impossible de charger les informations du club.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClub();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <Spinner className="w-8 h-8 text-[#774BBE]" />
                <p className="text-sm text-slate-500 animate-pulse">Récupération des informations...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 bg-red-50 p-4 rounded-xl border border-red-100">
                <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                <p className="font-semibold text-red-700">Une erreur est survenue</p>
                <p className="text-sm text-red-600">{error}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center text-center space-y-6 py-4 animate-in fade-in zoom-in-95 duration-300">

            {/* --- Icône Visuelle (Status Pending) --- */}
            <div className="relative">
                <div className="absolute inset-0 bg-amber-100 rounded-full blur-md opacity-50 animate-pulse"></div>
                <div className="relative h-20 w-20 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100 shadow-sm">
                    <Timer className="w-10 h-10 text-amber-500" />
                </div>
            </div>

            {/* --- Message Principal --- */}
            <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-900">
                    Demande envoyée avec succès !
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
                    Vous avez demandé à rejoindre le club :
                </p>

                {/* Badge Nom du Club */}
                {club && (
                    <div className="mt-2 inline-flex items-center px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
                        <span className="font-bold text-slate-800">{club.Name}</span>
                    </div>
                )}
            </div>

            {/* --- Information Complémentaire --- */}
            <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-lg text-left w-full">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900">Que va-t-il se passer ?</p>
                    <p className="text-xs text-blue-700 leading-relaxed">
                        Un administrateur du club doit valider votre demande. Vous recevrez un email de confirmation dès que votre accès sera activé.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default WaitingClubResponse;