"use client"
import { Club } from '@prisma/client';
import { createContext, useContext, useState, useMemo } from 'react';

type CurrentClubContextType = {
    currentClub: Club | undefined;
    setCurrentClub: React.Dispatch<React.SetStateAction<Club | undefined>>;
};

const CurrentClubContext = createContext<CurrentClubContextType | undefined>(undefined);

export function CurrentClubWrapper({ children }: { children: React.ReactNode }) {
    const [currentClub, setCurrentClub] = useState<Club | undefined>(undefined);

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
