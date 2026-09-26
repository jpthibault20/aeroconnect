import { userRole } from "@prisma/client";

// Role labels shown in the wallet (same wording as the menu).
export const ROLE_LABELS: Record<userRole, string> = {
    USER: "Visiteur",
    STUDENT: "Élève",
    PILOT: "Pilote",
    OWNER: "Président",
    ADMIN: "Admin",
    INSTRUCTOR: "Instructeur",
    MANAGER: "Manager",
};
