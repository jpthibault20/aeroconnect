import { flightNature, instructionSubType, pilotFunction, userRole } from "@prisma/client";

const INSTRUCTOR_ROLES: userRole[] = [
    userRole.INSTRUCTOR,
    userRole.OWNER,
    userRole.ADMIN,
];

export function isInstructorRole(role: userRole): boolean {
    return INSTRUCTOR_ROLES.includes(role);
}

// pilotFunction est déduit de la nature du vol + du rôle de l'utilisateur qui
// crée l'entrée. Plus d'input direct côté UI.
export function derivePilotFunction(
    nature: flightNature,
    userRoleValue: userRole
): pilotFunction {
    if (nature === "CDB") return "P";
    return isInstructorRole(userRoleValue) ? "I" : "EP";
}

// Durée en minutes : calculée à la volée depuis les heures moteur. Pas stockée
// en DB pour rester source-of-truth unique (hobbs).
export function computeDurationMinutes(
    hobbsStart: number | null | undefined,
    hobbsEnd: number | null | undefined
): number {
    if (hobbsStart == null || hobbsEnd == null) return 0;
    const diff = hobbsEnd - hobbsStart;
    if (diff <= 0) return 0;
    return Math.round(diff * 60);
}

export interface FlightTimes {
    durationMinutes: number;
    timeDC: number;
    timePIC: number;
    timeInstructor: number;
}

export function computeFlightTimes(log: {
    hobbsStart: number | null;
    hobbsEnd: number | null;
    pilotFunction: pilotFunction;
}): FlightTimes {
    const duration = computeDurationMinutes(log.hobbsStart, log.hobbsEnd);
    return {
        durationMinutes: duration,
        timeDC: log.pilotFunction === "EP" ? duration : 0,
        timePIC: log.pilotFunction === "P" ? duration : 0,
        timeInstructor: log.pilotFunction === "I" ? duration : 0,
    };
}

// Validation de la cohérence nature / sous-type.
export function validateNatureSubType(
    nature: flightNature,
    subType: instructionSubType | null | undefined
): { ok: true } | { ok: false; error: string } {
    if (nature === "INSTRUCTION" && !subType) {
        return { ok: false, error: "Un sous-type est requis pour un vol d'instruction" };
    }
    if (nature === "CDB" && subType) {
        return { ok: false, error: "Un sous-type n'est pas attendu pour un vol en commandant de bord" };
    }
    return { ok: true };
}

export const NATURE_LABELS: Record<flightNature, string> = {
    CDB: "Commandant de bord",
    INSTRUCTION: "Instruction",
};

export const INSTRUCTION_SUBTYPE_LABELS: Record<instructionSubType, string> = {
    LOCAL: "Local",
    NAVIGATION: "Navigation",
    LACHE: "Lâché",
    BAPTEME: "Baptême",
    EXAM: "Examen",
};

// Libellé court (pour les tableaux et PDF).
export function formatNature(
    nature: flightNature,
    subType: instructionSubType | null
): string {
    if (nature === "CDB") return "CdB";
    if (!subType) return "Instruction";
    return `Instr. (${INSTRUCTION_SUBTYPE_LABELS[subType]})`;
}

// Libellé long pour affichage détaillé.
export function formatNatureLong(
    nature: flightNature,
    subType: instructionSubType | null
): string {
    if (nature === "CDB") return "Commandant de bord";
    if (!subType) return "Instruction";
    return `Instruction — ${INSTRUCTION_SUBTYPE_LABELS[subType]}`;
}
