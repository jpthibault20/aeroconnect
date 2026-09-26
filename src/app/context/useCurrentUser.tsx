"use client"
import { User } from '@prisma/client';
import { createContext, useContext, useState, useMemo } from 'react';

type CurrentUserContextType = {
    currentUser: User | undefined;
    setCurrentUser: React.Dispatch<React.SetStateAction<User | undefined>>;
};

const CurrentUserContext = createContext<CurrentUserContextType | undefined>(undefined);

export function CurrentUserWrapper({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | undefined>(undefined);

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
