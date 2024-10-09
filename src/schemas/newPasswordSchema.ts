import * as z from "zod";

export const newPasswordSchema = z.object({
    email: z.string().email("L'adresse e-mail est invalide"),
});
export type NewPasswordSchema = z.infer<typeof newPasswordSchema>;


export const updatePasswordSchema = z.object({
    password: z
        .string()
        .min(6, "Le mot de passe doit contenir au moins 6 caractères"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: "Les mots de passe ne correspondent pas",
});
export type UpdatePasswordSchema = z.infer<typeof updatePasswordSchema>;