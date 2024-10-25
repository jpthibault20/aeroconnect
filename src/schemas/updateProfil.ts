import * as z from "zod";

export const updateProfileSchema = z.object({
    firstName: z.string().min(1, "Le prénom doit contenir au moins 1 caractère"),
    lastName: z.string().min(1, "Le nom doit contenir au moins 1 caractère"),
    email: z.string().email("L'adresse e-mail est invalide"),
    phone: z.string().min(10, "Le numéro de téléphone doit contenir au moins 10 caractères"),
    adress: z.string().min(1, "L'adresse doit contenir au moins 1 caractère"),
    city: z.string().min(1, "La ville doit contenir au moins 1 caractère"),
    zipCode: z.string().min(5, "Le code postal doit contenir au moins 5 caractères"),
    country: z.string().min(1, "Le pays doit contenir au moins 1 caractère"),
});

export type UpdateProfileSchema = z.infer<typeof updateProfileSchema>;