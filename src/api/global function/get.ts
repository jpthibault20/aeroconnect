import { UserExemple } from "@/config/exempleData"
import { userRole } from "@prisma/client";

export const getInsctructors = () => {
    const instructors = UserExemple.filter(user => user.role === userRole.INSTRUCTOR);

    // Retourner uniquement les utilisateurs avec le rôle 'INSTRUCTOR'
    return instructors;
}