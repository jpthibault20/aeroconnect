"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getAllClubs } from "@/api/db/club";
import RequestClubID from "./RequestClubID";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import WaitingClubResponse from "./WaitingClubResponse";
import NewClub from "./NewClub";
import { LogOut, Plane, ArrowLeft } from "lucide-react";
import { signOut } from "@/app/auth/login/action";
import { Spinner } from "./ui/SpinnerVariants";
import { Button } from "@/components/ui/button";

interface Club {
    id: string;
    name: string;
}

const NoClubID = () => {
    const [newClub, setNewClub] = useState(false);
    const [clubs, setClubs] = useState<Club[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { currentUser } = useCurrentUser();
    const [requestClubID, setRequestClubID] = useState(false);
    const [selectedClubID, setSelectedClubID] = useState("");
    const [logoutLoading, setLogoutLoading] = useState(false);

    const fetchClubs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const fetchedClubs = await getAllClubs();
            setClubs(fetchedClubs);
        } catch (err) {
            console.error("Erreur lors de la récupération des clubs :", err);
            setError("Impossible de charger les clubs. Veuillez réessayer.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchClubs();
    }, [fetchClubs]);

    const handleLogout = async () => {
        setLogoutLoading(true);
        await signOut();
    };

    // --- Gestion du Titre et Description dynamique ---
    const getHeaderContent = () => {
        if (currentUser?.clubIDRequest || requestClubID) {
            return { title: "Demande envoyée", desc: "En attente de validation." };
        }
        if (newClub) {
            return { title: "Nouveau Club", desc: "Créez votre structure pour démarrer." };
        }
        return { title: "Bienvenue sur Aero Connect", desc: "Rejoignez un aéroclub pour accéder à votre espace." };
    };

    const headerContent = getHeaderContent();

    return (
        // OVERLAY GLOBAL : z-[9999] assure que c'est au-dessus de tout le reste
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300">

            <Card className="w-full max-w-lg bg-white shadow-2xl border-none overflow-hidden flex flex-col max-h-[90vh]">

                {/* --- Header avec Navigation --- */}
                <CardHeader className="bg-slate-50 border-b border-slate-100 p-6 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        {/* Bouton Retour (si on est dans Création) */}
                        {newClub && !requestClubID && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setNewClub(false)}
                                className="h-8 w-8 -ml-2 text-slate-500 hover:text-slate-900"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        )}

                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                {!newClub && <div className="p-1.5 bg-[#774BBE]/10 rounded-md"><Plane className="w-4 h-4 text-[#774BBE]" /></div>}
                                <CardTitle className="text-xl font-bold text-slate-900">
                                    {headerContent.title}
                                </CardTitle>
                            </div>
                            <CardDescription className="text-slate-500">
                                {headerContent.desc}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                {/* --- Contenu Scrollable --- */}
                <CardContent className="p-0 overflow-hidden flex-1 flex flex-col">
                    <div className="overflow-y-auto p-6 flex-1">
                        {currentUser?.clubIDRequest || requestClubID ? (
                            <WaitingClubResponse clubIDprops={selectedClubID} />
                        ) : newClub ? (
                            <NewClub setNewClub={setNewClub} />
                        ) : (
                            <RequestClubID
                                setError={setError}
                                setLoading={setLoading}
                                clubs={clubs}
                                loading={loading}
                                error={error}
                                newClubButton={() => setNewClub(true)}
                                setRequestClubID={setRequestClubID}
                                setSelectedClubID={setSelectedClubID}
                            />
                        )}
                    </div>
                </CardContent>

                {/* --- Footer (Déconnexion) --- */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-center flex-shrink-0">
                    <Button
                        variant="ghost"
                        onClick={handleLogout}
                        disabled={logoutLoading}
                        className="text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors text-sm"
                    >
                        {logoutLoading ? <Spinner className="w-4 h-4 mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                        Se déconnecter
                    </Button>
                </div>

            </Card>
        </div>
    );
};

export default NoClubID;