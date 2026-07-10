import { flight_logs } from "@prisma/client";

/**
 * Helpers d'affichage / export du carnet de vol, factorisés en fonctions pures
 * pour être partagés entre les composants et les tests (cf. convention CLAUDE.md).
 */

// ─── Carnet de route machine : export PDF ───

export interface MachineLogGroup<T> {
    planeRegistration: string;
    planeName: string;
    logs: T[];
}

/**
 * Regroupe des vols par machine pour l'export « Tous les aéronefs » (une section
 * PDF par machine). La clé de regroupement est planeID si présent, sinon
 * l'immatriculation dénormalisée (robuste aux machines supprimées). Le nom et
 * l'immatriculation de la section proviennent des champs dénormalisés du 1er vol.
 * Résultat trié par immatriculation.
 */
export function groupLogsByMachine<
    T extends Pick<flight_logs, "planeID" | "planeRegistration" | "planeName">
>(logs: T[]): MachineLogGroup<T>[] {
    const groups = new Map<string, T[]>();
    for (const log of logs) {
        const key = log.planeID ?? log.planeRegistration ?? "—";
        const arr = groups.get(key);
        if (arr) arr.push(log);
        else groups.set(key, [log]);
    }
    return [...groups.values()]
        .map((groupLogs) => ({
            planeRegistration: groupLogs[0]?.planeRegistration ?? "",
            planeName: groupLogs[0]?.planeName ?? "",
            logs: groupLogs,
        }))
        .sort((a, b) => a.planeRegistration.localeCompare(b.planeRegistration));
}

/** L'export du carnet de route est possible dès qu'il y a au moins un vol. */
export function canExportAircraftLogbook(logs: unknown[]): boolean {
    return logs.length > 0;
}

// ─── Bouton / colonne "Signé" ───

export type SignButtonState = "signed" | "pending" | "signable";

/**
 * État à afficher pour un vol dans la colonne "Signé" :
 *  - "signed"   : déjà signé (pastille verte) ;
 *  - "pending"  : non signé, mais l'utilisateur ne peut pas signer (lecture seule
 *                 ou il n'est pas le pilote du vol) → statut "En attente" ;
 *  - "signable" : non signé et l'utilisateur est le pilote → bouton "Signer".
 */
export function signButtonState(
    log: Pick<flight_logs, "pilotSigned" | "pilotID">,
    currentUserID: string | undefined,
    readOnly: boolean
): SignButtonState {
    if (log.pilotSigned) return "signed";
    if (readOnly || currentUserID !== log.pilotID) return "pending";
    return "signable";
}

// ─── Affichage de l'élève (carnet de route) ───

/**
 * Faut-il afficher l'élève sur la ligne ? Uniquement pour un vol d'instruction
 * dont l'élève est renseigné (les vols CDB n'ont pas d'élève).
 */
export function shouldShowStudent(
    log: Pick<flight_logs, "flightNature" | "studentFirstName" | "studentLastName">
): boolean {
    return log.flightNature === "INSTRUCTION" && !!(log.studentFirstName || log.studentLastName);
}
