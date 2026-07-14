import { MachineUsage } from "@prisma/client";

// Libellés FR des usages d'une machine du club.
export const USAGE_OPTIONS: { value: MachineUsage; label: string }[] = [
    { value: "INSTRUCTION", label: "Instruction" },
    { value: "LOCATION", label: "Location" },
    { value: "CLUB", label: "Club" },
];

export function usageLabel(usage: MachineUsage): string {
    return USAGE_OPTIONS.find((o) => o.value === usage)?.label ?? usage;
}
