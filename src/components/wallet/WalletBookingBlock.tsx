"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, Ban, Wallet } from "lucide-react";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { useWallet } from "@/hooks/useWallet";
import { bookingMinRequirement, formatCents, isBookingGatedRole } from "@/lib/wallet";
import ClubPaymentContact from "./ClubPaymentContact";

/**
 * Replaces the booking form when the student's / pilot's balance is below the
 * club threshold (AER-66, AER-73): explanation + club contact. No greyed-out
 * button: the real action is to contact the club.
 */
export const WalletBookingBlock = ({ balanceCents, bookingMinCents }: { balanceCents: number; bookingMinCents: number }) => {
    const { currentClub } = useCurrentClub();
    return (
        <div className="flex flex-col items-center text-center gap-3 py-2">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-600">
                <Wallet className="h-6 w-6" />
            </span>
            <h3 className="text-base font-semibold text-slate-800">Solde insuffisant pour réserver</h3>
            <p className="text-sm text-slate-500 max-w-sm">
                Votre solde est de <span className="font-mono tabular-nums font-semibold text-red-600">{formatCents(balanceCents)}</span>.
                Pour vous inscrire à un créneau, il doit être {bookingMinRequirement(bookingMinCents)}.
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
 * Calendar banner for the signed-in student / pilot, only shown when their
 * balance is low or below the booking threshold (wallet enabled).
 */
export const CalendarWalletNotice = ({ className }: { className?: string }) => {
    const { currentUser } = useCurrentUser();
    const wallet = useWallet();
    if (!wallet.enabled || !isBookingGatedRole(currentUser?.role) || wallet.balanceCents == null) return null;
    if (wallet.state !== "low" && wallet.state !== "blocked") return null;
    return (
        <div className={className}>
            <WalletCalendarBanner balanceCents={wallet.balanceCents} state={wallet.state} />
        </div>
    );
};

/** Calendar banner: warns even before a slot is opened. */
export const WalletCalendarBanner = ({ balanceCents, state }: { balanceCents: number; state: "low" | "blocked" }) => {
    const { currentClub } = useCurrentClub();
    const href = `/wallet?clubID=${currentClub?.id ?? ""}`;

    if (state === "blocked") {
        return (
            <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                <Ban className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                    Solde insuffisant (<span className="font-mono tabular-nums">{formatCents(balanceCents)}</span>) : vous ne pouvez plus vous inscrire.{" "}
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
