"use client";

import React from "react";
import { Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
    clubID: string;
    token: string | null;
}

/**
 * One-line discovery-flight booking link (Club page overview). The QR code, PDF
 * export and regeneration live in Settings › Discovery-flight link.
 */
const PublicBookingLinkRow = ({ clubID, token }: Props) => {
    if (!token) return null;
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/reservation/${clubID}/${token}`;

    // Native share on phones, otherwise copy to the clipboard.
    const onShare = async () => {
        const nav = navigator as Navigator & { share?: (data: { url: string; title?: string; text?: string }) => Promise<void> };
        if (nav.share) {
            try {
                await nav.share({ url, title: "Baptême de l'air", text: "Réservez votre vol baptême" });
            } catch {
                // Share cancelled by the user: nothing to report.
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
