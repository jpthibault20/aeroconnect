import { z } from "zod";
import { PaymentMethod } from "@prisma/client";

/**
 * Opération manuelle sur un portefeuille (AER-66), saisie par la gestion.
 * Validée côté client (WalletOperationDialog) ET côté serveur
 * (recordWalletOperation), même convention que src/schemas/baptemeOptions.ts.
 *
 * Le montant est TOUJOURS positif : c'est `kind` qui donne le sens
 * (CREDIT => paiement reçu, WITHDRAW => retrait / correction, enregistré en
 * ADJUSTMENT négatif).
 */
export const walletOperationSchema = z
    .object({
        memberID: z.string().min(1, "Sélectionnez un membre."),
        kind: z.enum(["CREDIT", "WITHDRAW"]),
        amountCents: z
            .number({ invalid_type_error: "Saisissez un montant supérieur à 0." })
            .int("Le montant ne peut pas avoir plus de 2 décimales.")
            .positive("Saisissez un montant supérieur à 0."),
        paymentMethod: z.nativeEnum(PaymentMethod).nullable().optional(),
        comment: z.string().trim().max(500, "Le commentaire est trop long (500 caractères max).").optional(),
    })
    .superRefine((data, ctx) => {
        if (data.kind === "CREDIT" && !data.paymentMethod) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["paymentMethod"], message: "Choisissez le moyen de paiement." });
        }
        if (data.kind === "WITHDRAW" && !data.comment) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["comment"], message: "Indiquez le motif du retrait." });
        }
    });

export type WalletOperationInput = z.infer<typeof walletOperationSchema>;
