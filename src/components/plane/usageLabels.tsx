import { MachineUsage } from "@prisma/client";

// Libellés FR des usages d'une machine du club.
// Volontairement conservé alors que plus aucun composant ne l'importe : le champ
// « Usages » est masqué des formulaires et des fiches en attendant d'être
// exploité par une règle métier (instruction / location). Ne pas supprimer.
export const USAGE_OPTIONS: { value: MachineUsage; label: string }[] = [
    { value: "INSTRUCTION", label: "Instruction" },
    { value: "LOCATION", label: "Location" },
    { value: "CLUB", label: "Club" },
];

export function usageLabel(usage: MachineUsage): string {
    return USAGE_OPTIONS.find((o) => o.value === usage)?.label ?? usage;
}
