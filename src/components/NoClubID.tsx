"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { getAllClubs } from "@/api/db/club";
import RequestClubID from "./RequestClubID";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import WaitingClubResponse from "./WaitingClubResponse";
import NewClub from "./NewClub";

interface Club {
    id: string;
    name: string;
}

const NoClubID = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isOpen, setIsOpen] = useState(true);
    const [newClub, setNewClub] = useState(false);
    const [clubs, setClubs] = useState<Club[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { currentUser } = useCurrentUser()
    const [requestClubID, setRequestClubID] = useState(false)
    const [selectedClubID, setSelectedClubID] = useState("")


    // Fonction pour récupérer les clubs
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

    const newClubButton = () => {
        setNewClub(true);
    }

    return isOpen ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center transition-opacity duration-300">
            <Card className="w-[90%] max-w-md mb-44 mt-10 lg:my-0">
                <CardContent className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex flex-col items-center space-y-2">
                        <h1 className="text-xl font-bold">Vous n&apos;avez pas de club</h1>
                        <p className="text-gray-600 text-center">
                            Rejoignez un club pour accéder à toutes les fonctionnalités de
                            l&apos;application.
                        </p>
                    </div>

                    <div className="max-h-[50vh] overflow-y-auto md:max-h-full">
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
                                newClubButton={newClubButton}
                                setRequestClubID={setRequestClubID}
                                setSelectedClubID={setSelectedClubID}
                            />
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    ) : null;
};

export default NoClubID;
