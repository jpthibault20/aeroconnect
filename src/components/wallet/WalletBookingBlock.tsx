"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, Ban, Wallet } from "lucide-react";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { useWallet } from "@/hooks/useWallet";
import { formatCents, isBookingGatedRole } from "@/lib/wallet";
import ClubPaymentContact from "./ClubPaymentContact";

/**
 * Remplace le formulaire de réservation quand le solde de l'élève / du pilote
 * est nul ou négatif (AER-66) : explication + contact du club. Pas de bouton
 * grisé : la vraie action est de contacter le club.
 */
export const WalletBookingBlock = ({ balanceCents }: { balanceCents: number }) => {
    const { currentClub } = useCurrentClub();
    return (
        <div className="flex flex-col items-center text-center gap-3 py-2">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-600">
                <Wallet className="h-6 w-6" />
            </span>
            <h3 className="text-base font-semibold text-slate-800">Solde insuffisant pour réserver</h3>
            <p className="text-sm text-slate-500 max-w-sm">
                Votre solde est de <span className="font-mono tabular-nums font-semibold text-red-600">{formatCents(balanceCents)}</span>.
                Pour vous inscrire à un créneau, il doit être positif.
            </p>
            <div className="h-px w-full bg-slate-100" />
            {currentClub && (
                <ClubPaymentContact
                    contact={currentClub}
                    intro="Contactez le club pour recharger votre compte :"
                    className="w-full text-center [&_div]:justify-center"
                />
            )}
            <Link href={`/wallet?clubID=${currentClub?.id ?? ""}`} className="text-sm font-medium text-[#774BBE] hover:underline">
                Voir mon portefeuille →
            </Link>
        </div>
    );
};

/**
 * Bandeau du calendrier pour l'élève / le pilote connecté, affiché seulement
 * si son solde est faible ou épuisé (portefeuille activé).
 */
export const CalendarWalletNotice = ({ className }: { className?: string }) => {
    const { currentUser } = useCurrentUser();
    const wallet = useWallet();
    if (!wallet.enabled || !isBookingGatedRole(currentUser?.role) || wallet.balanceCents == null) return null;
    if (wallet.state !== "low" && wallet.state !== "empty") return null;
    return (
        <div className={className}>
            <WalletCalendarBanner balanceCents={wallet.balanceCents} state={wallet.state} />
        </div>
    );
};

/** Bandeau du calendrier : prévient avant même d'ouvrir un créneau. */
export const WalletCalendarBanner = ({ balanceCents, state }: { balanceCents: number; state: "low" | "empty" }) => {
    const { currentClub } = useCurrentClub();
    const href = `/wallet?clubID=${currentClub?.id ?? ""}`;

    if (state === "empty") {
        return (
            <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                <Ban className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                    Solde épuisé (<span className="font-mono tabular-nums">{formatCents(balanceCents)}</span>) : vous ne pouvez plus vous inscrire.{" "}
                    <Link href={href} className="font-semibold underline underline-offset-2 whitespace-nowrap">Voir mon portefeuille →</Link>
                </span>
            </div>
        );
    }
    return (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
                Solde faible (<span className="font-mono tabular-nums">{formatCents(balanceCents)}</span>) : pensez à recharger votre compte.{" "}
                <Link href={href} className="font-semibold underline underline-offset-2 whitespace-nowrap">Voir mon portefeuille →</Link>
            </span>
        </div>
    );
};
