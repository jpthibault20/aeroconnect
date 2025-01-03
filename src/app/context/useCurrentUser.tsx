"use client"
import { User } from '@prisma/client';
import { createContext, useContext, useState, useMemo } from 'react';

// Création d'un type pour le contexte qui inclut l'utilisateur et la fonction setCurrentUser
type CurrentUserContextType = {
    currentUser: User | undefined;
    setCurrentUser: React.Dispatch<React.SetStateAction<User | undefined>>;
};

// Initialiser le contexte avec un type qui accepte undefined au départ
const CurrentUserContext = createContext<CurrentUserContextType | undefined>(undefined);

export function CurrentUserWrapper({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | undefined>(undefined);

    // Utilisation de useMemo pour éviter de recréer l'objet context inutilement
    const value = useMemo(() => ({ currentUser, setCurrentUser }), [currentUser, setCurrentUser]);

    return (
        <CurrentUserContext.Provider value={value}>
            {children}
        </CurrentUserContext.Provider>
    );
}

export function useCurrentUser() {
    const context = useContext(CurrentUserContext);

    if (context === undefined) {
        throw new Error("useCurrentUser must be used within a CurrentUserWrapper");
    }

    return context;
}
