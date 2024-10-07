"use client"
import { createContext, useContext, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ExempleContext = createContext<any>(undefined)

export function ExempleWrapper ({children}: {children: React.ReactNode}) {
    const [exemple, setExemple] = useState("test OK")

    return (
        <ExempleContext.Provider value={{exemple, setExemple}}>
            {children}
        </ExempleContext.Provider>
    )
}

export function useExemple () {
    return useContext(ExempleContext)
}