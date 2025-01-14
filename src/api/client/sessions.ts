// "use client"
// "use server"

export interface findSessions {
    clubID: string;
    piloteID: string;
    reccurence: string[];
    startDelete: Date;
    endDelete: Date;
    endReccurence: Date | undefined;
}

export const findSessions = (data: findSessions) => {
    if (!data.clubID || !data.piloteID) {
        return { error: "Les IDs du club et du pilote sont obligatoires" };
    }
    if (!data.reccurence || data.reccurence.length === 0) {
        return { error: "une config de récurrence est obligatoire" };
    }
    if (!data.startDelete || !data.endDelete) {
        return { error: "La date de début ou de fin de la suppression est obligatoire" };
    }

    if (data.endReccurence && data.endReccurence <= data.startDelete) {
        return { error: "La date de fin de récurrence doit être après la date de début" };
    }
    console.log(data);
    console.log(data.startDelete.getUTCHours());
}