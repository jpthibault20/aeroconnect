import { flight_logs } from "@prisma/client";

// Une session d'instruction génère deux flight_logs (instructeur "I" + élève
// "EP") pour le même vol. Ce helper consolide chaque paire en une seule ligne
// pour éviter les doublons (compteur, totaux, listes). L'entrée non-EP sert
// de base et hérite des champs complémentaires de l'entrée élève (studentID,
// etc.). Les logs sans sessionID (entrées manuelles, vols privés) passent
// inchangés.
export function mergeSessionLogs(logs: flight_logs[]): flight_logs[] {
    const bySession = new Map<string, flight_logs>();

    for (const log of logs) {
        if (!log.sessionID) continue;
        const existing = bySession.get(log.sessionID);
        if (!existing) {
            bySession.set(log.sessionID, log);
            continue;
        }

        // L'entrée pilote/instructeur (I ou P) sert de base ; l'entrée élève
        // (EP) ne fait que compléter les références aux personnes manquantes.
        const isLogPrimary = log.pilotFunction !== "EP";
        const base = isLogPrimary ? log : existing;
        const other = isLogPrimary ? existing : log;

        bySession.set(log.sessionID, {
            ...base,
            studentID: base.studentID ?? other.studentID,
            studentFirstName: base.studentFirstName ?? other.studentFirstName,
            studentLastName: base.studentLastName ?? other.studentLastName,
            instructorID: base.instructorID ?? other.instructorID,
            instructorFirstName: base.instructorFirstName ?? other.instructorFirstName,
            instructorLastName: base.instructorLastName ?? other.instructorLastName,
        });
    }

    const seen = new Set<string>();
    const result: flight_logs[] = [];
    for (const log of logs) {
        if (!log.sessionID) {
            result.push(log);
            continue;
        }
        if (seen.has(log.sessionID)) continue;
        seen.add(log.sessionID);
        const merged = bySession.get(log.sessionID);
        if (merged) result.push(merged);
    }
    return result;
}
