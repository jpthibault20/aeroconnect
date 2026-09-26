import { z } from "zod";
import { PaymentMethod } from "@prisma/client";

/**
 * Manual wallet operation (AER-66), entered by management. Validated client-side
 * (WalletOperationDialog) AND server-side (recordWalletOperation), same
 * convention as src/schemas/baptemeOptions.ts.
 *
 * The amount is ALWAYS positive: `kind` gives the direction (CREDIT => payment
 * received, WITHDRAW => withdrawal / correction, recorded as a negative
 * ADJUSTMENT).
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
