"use client";

import React from "react";
import Link from "next/link";
import { userRole } from "@prisma/client";
import { Wallet } from "lucide-react";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { canManageWallet, WALLET_HIDDEN_ROLES } from "@/lib/wallet";
import { cn } from "@/lib/utils";

interface Props {
    member: { id: string; role: userRole };
    variant?: "icon" | "button";
    className?: string;
}

/**
 * Raccourci de la page Utilisateurs vers la fiche portefeuille d'un membre,
 * fenêtre de crédit ouverte (AER-66). Gestion uniquement, portefeuille activé.
 */
const MemberWalletLink = ({ member, variant = "icon", className }: Props) => {
    const { currentUser } = useCurrentUser();
    const { currentClub } = useCurrentClub();
    if (!currentClub?.walletEnabled || !canManageWallet(currentUser?.role) || WALLET_HIDDEN_ROLES.includes(member.role)) {
        return null;
    }
    const href = `/wallet?clubID=${currentClub.id}&userID=${member.id}&action=credit`;

    if (variant === "button") {
        return (
            <Link
                href={href}
                className={cn(
                    "inline-flex w-full items-center justify-center gap-2 rounded-md border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50",
                    className
                )}
            >
                <Wallet className="w-4 h-4" /> Portefeuille
            </Link>
        );
    }
    return (
        <Link
            href={href}
            title="Portefeuille : créditer ce membre"
            className={cn("inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50", className)}
        >
            <Wallet className="w-4 h-4" />
        </Link>
    );
};

export default MemberWalletLink;
