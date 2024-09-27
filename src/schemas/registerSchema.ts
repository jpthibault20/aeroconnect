import * as z from "zod";

export const registerSchema = z.object({
    name: z.string().min(2, "Le nom doit comporter au moins 2 caractères"),
    firstName: z.string().min(2, "Le prénom doit comporter au moins 2 caractères"),
    email: z.string().email("L'adresse e-mail est invalide"),
    password: z.string().min(6, "Le mot de passe doit comporter au moins 6 caractères"),
    phone: z.string().min(10, "Le numéro de téléphone doit comporter au moins 10 caractères"),
});

export type RegisterSchema = z.infer<typeof registerSchema>;
