import { flight_logs } from "@prisma/client";

// Une session d'instruction génère deux flight_logs (instructeur + élève) sur
// le même appareil. Le carnet de route machine doit en montrer un seul : on
// garde l'entrée pilote/instructeur (P ou I) plutôt que la copie élève (EP).
// Les logs sans sessionID (manuels, vols privés) sont conservés tels quels.
export function dedupAircraftLogs(logs: flight_logs[]): flight_logs[] {
    const winnerBySession = new Map<string, flight_logs>();

    for (const log of logs) {
        if (!log.sessionID) continue;
        const current = winnerBySession.get(log.sessionID);
        if (!current || (current.pilotFunction === "EP" && log.pilotFunction !== "EP")) {
            winnerBySession.set(log.sessionID, log);
        }
    }

    return logs.filter((log) => {
        if (!log.sessionID) return true;
        return winnerBySession.get(log.sessionID)?.id === log.id;
    });
}
