import * as z from "zod";

export const loginSchema = z.object({
    email: z.string().email("L'adresse e-mail est invalide"),
    password: z.string().min(6, "Le mot de passe doit comporter au moins 6 caractères"),
});

export type LoginSchema = z.infer<typeof loginSchema>;
