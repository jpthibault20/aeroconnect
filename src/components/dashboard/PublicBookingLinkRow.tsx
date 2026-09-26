"use client";

import React from "react";
import { Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
    clubID: string;
    token: string | null;
}

/**
 * Lien de réservation baptême en une ligne (aperçu de la page Club). Le QR
 * code, l'export PDF et la régénération sont dans Paramètres › Lien baptême.
 */
const PublicBookingLinkRow = ({ clubID, token }: Props) => {
    if (!token) return null;
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/reservation/${clubID}/${token}`;

    // Partage natif sur téléphone, sinon copie dans le presse-papiers.
    const onShare = async () => {
        const nav = navigator as Navigator & { share?: (data: { url: string; title?: string; text?: string }) => Promise<void> };
        if (nav.share) {
            try {
                await nav.share({ url, title: "Baptême de l'air", text: "Réservez votre vol baptême" });
            } catch {
                // Partage annulé par l'utilisateur : rien à signaler.
            }
            return;
        }
        try {
            await navigator.clipboard.writeText(url);
            toast({ title: "Lien copié", className: "bg-green-600 text-white border-none" });
        } catch {
            toast({ title: "Impossible de copier le lien", variant: "destructive" });
        }
    };

    return (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold text-slate-900">Lien baptême</span>
                <span className="truncate text-xs text-slate-500">{url.replace(/^https?:\/\//, "")}</span>
            </div>
            <button
                type="button"
                onClick={onShare}
                className="flex min-h-10 flex-shrink-0 items-center gap-2 rounded-xl bg-[#774BBE] px-4 text-sm font-semibold text-white hover:bg-[#6538a5]"
            >
                <Share2 className="h-4 w-4" /> Partager
            </button>
        </div>
    );
};

export default PublicBookingLinkRow;
