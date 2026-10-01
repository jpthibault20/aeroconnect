"use client";

import React from "react";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { canViewClubWallets } from "@/lib/wallet";
import MemberWalletDetail from "./MemberWalletDetail";
import WalletMembersPage from "./WalletMembersPage";

/**
 * /wallet: content depends on the role (same principle as the Club page).
 *  - student / pilot: "My wallet" (userID ignored);
 *  - instructor / management: "Wallets" list, or a member's details with ?userID=.
 * Actual rights are checked server-side.
 */
const WalletPageComponent = ({ userID, openCredit = false }: { userID: string | null; openCredit?: boolean }) => {
    const { currentUser } = useCurrentUser();
    const { currentClub } = useCurrentClub();

    let content: React.ReactNode;
    if (currentClub && !currentClub.walletEnabled) {
        content = (
            <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-3 shadow-sm">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-purple-50 text-[#774BBE]"><Wallet className="h-6 w-6" /></span>
                <h1 className="font-semibold text-slate-800">Portefeuille non activé</h1>
                <p className="text-sm text-slate-500">Le portefeuille élève n&apos;est pas activé pour ce club.</p>
                <Link href={`/calendar?clubID=${currentClub.id}`} className="text-sm font-medium text-[#774BBE] hover:underline">
                    Retour au calendrier
                </Link>
            </div>
        );
    } else if (canViewClubWallets(currentUser?.role) && !userID) {
        content = <WalletMembersPage />;
    } else {
        const target = canViewClubWallets(currentUser?.role) && userID !== currentUser?.id ? userID : null;
        content = <MemberWalletDetail key={target ?? "self"} userID={target} openCredit={openCredit && !!target} />;
    }

    return (
        <div className="flex min-h-full flex-col bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
            {/* Flex column so the full-page loader of the child views fills the height. */}
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">{content}</div>
        </div>
    );
};

export default WalletPageComponent;
