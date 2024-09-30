import * as z from "zod";

export const newPasswordSchema = z.object({
    email: z.string().email("L'adresse e-mail est invalide"),
});

export type NewPasswordSchema = z.infer<typeof newPasswordSchema>;
