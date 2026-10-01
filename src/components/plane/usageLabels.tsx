import { MachineUsage } from "@prisma/client";

// French labels of a club plane's usages.
// Deliberately kept although no component imports it anymore: the "Usages"
// field is hidden from forms and plane cards until a business rule uses it
// (instruction / rental). Do not delete.
export const USAGE_OPTIONS: { value: MachineUsage; label: string }[] = [
    { value: "INSTRUCTION", label: "Instruction" },
    { value: "LOCATION", label: "Location" },
    { value: "CLUB", label: "Club" },
];

export function usageLabel(usage: MachineUsage): string {
    return USAGE_OPTIONS.find((o) => o.value === usage)?.label ?? usage;
}
