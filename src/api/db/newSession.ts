"use server"

export interface interfaceSessoin {
    date: Date | undefined;
    startHour: string;
    startMinute: string;
    endHour: string;
    endMinute: string;
    endReccurence: Date | undefined;
    planeId: number[];
}

export const newSession = async (sessionData: interfaceSessoin) => {
    
    // test si il y a une date de session
    if (!sessionData.date)  return {error: "La date de session est obligatoire"}
    if (sessionData.date) {
        // test si la date de session est valide
        if (sessionData.date < new Date()) {
            return {error: "La date de session doit être dans le futur"}
        }
    }
    return {error: "error"}
}