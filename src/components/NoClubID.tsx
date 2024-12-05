"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { getAllClubs } from "@/api/db/club";
import { Button } from "./ui/button";

interface Club {
    id: string;
    name: string;
}

const NoClubID = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isOpen, setIsOpen] = useState(true);
    const [clubs, setClubs] = useState<Club[]>([]);
    const [selectedClub, setSelectedClub] = useState<Club>({
        id: "",
        name: "Choisissez votre club",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    const onSubmit = () => {
        console.log("Submit button clicked");
        console.log(selectedClub);
    };

    return isOpen ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center transition-opacity duration-300">
            <Card className="w-[90%] max-w-md">
                <CardContent className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex flex-col items-center space-y-2">
                        <h1 className="text-xl font-bold">Vous n&apos;avez pas de club</h1>
                        <p className="text-gray-600">
                            Rejoignez un club pour accéder à toutes les fonctionnalités de
                            l&apos;application.
                        </p>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col space-y-4">
                        <span className="font-semibold">Votre club :</span>
                        {loading ? (
                            <p className="text-gray-600">Chargement des clubs...</p>
                        ) : error ? (
                            <p className="text-red-500">{error}</p>
                        ) : (
                            <DropdownMenu>
                                <DropdownMenuTrigger>
                                    <div className="border border-gray-600 rounded-lg px-3 py-2 flex items-center justify-between shadow-md">
                                        <span>{selectedClub.name}</span>
                                        <ChevronDown />
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    {clubs.map((club) => (
                                        <DropdownMenuItem
                                            key={club.id}
                                            onSelect={() => setSelectedClub(club)}
                                        >
                                            {club.name}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    {/* Submit button */}
                    <div className="flex justify-center items-center">
                        <Button
                            onClick={onSubmit}
                            variant={"perso"}
                        >
                            Valider
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    ) : null;
};

export default NoClubID;
