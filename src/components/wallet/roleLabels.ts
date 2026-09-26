import { userRole } from "@prisma/client";

// Libellés des rôles affichés dans le portefeuille (mêmes termes que le menu).
export const ROLE_LABELS: Record<userRole, string> = {
    USER: "Visiteur",
    STUDENT: "Élève",
    PILOT: "Pilote",
    OWNER: "Président",
    ADMIN: "Admin",
    INSTRUCTOR: "Instructeur",
    MANAGER: "Manager",
};
