"use client"
import { Club } from '@prisma/client';
import { createContext, useContext, useState, useMemo } from 'react';

// Création d'un type pour le contexte qui inclut l'utilisateur et la fonction setCurrentClub
type CurrentClubContextType = {
    currentClub: Club | undefined;
    setCurrentClub: React.Dispatch<React.SetStateAction<Club | undefined>>;
};

// Initialiser le contexte avec un type qui accepte undefined au départ
const CurrentClubContext = createContext<CurrentClubContextType | undefined>(undefined);

export function CurrentClubWrapper({ children }: { children: React.ReactNode }) {
    const [currentClub, setCurrentClub] = useState<Club | undefined>(undefined);

    // Utilisation de useMemo pour éviter de recréer l'objet context inutilement
    const value = useMemo(() => ({ currentClub, setCurrentClub }), [currentClub, setCurrentClub]);

    return (
        <CurrentClubContext.Provider value={value}>
            {children}
        </CurrentClubContext.Provider>
    );
}

export function useCurrentClub() {
    const context = useContext(CurrentClubContext);

    if (context === undefined) {
        throw new Error("useCurrentClub must be used within a CurrentClubWrapper");
    }

    return context;
}
