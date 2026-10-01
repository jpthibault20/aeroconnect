"use client";

import React, { useState } from "react";
import { flight_logs } from "@prisma/client";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { signFlightLog } from "@/api/db/logbook";
import { toast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/SpinnerVariants";
import { Check, Clock, PenLine } from "lucide-react";
import { signButtonState } from "@/lib/logbookDisplay";
import { emitWalletChanged } from "@/lib/walletEvents";

interface Props {
    log: flight_logs;
    onSigned: (updated: flight_logs) => void;
    // If provided, clicking "Sign" delegates to this callback (typically to open the
    // completion popup, which validates then signs) instead of signing directly.
    // Either way, the click stops propagation to avoid double-firing a parent
    // onClick (row click).
    onTriggerEdit?: () => void;
    // Read-only: show the STATUS (signed / pending) without ever offering the "Sign"
    // action (e.g. a student viewing their plane's logbook).
    readOnly?: boolean;
}

const SignFlightLogButton = React.memo(({ log, onSigned, onTriggerEdit, readOnly = false }: Props) => {
    const { currentUser } = useCurrentUser();
    const [loading, setLoading] = useState(false);

    // Shared pill template: same height, padding and rhythm; only color + icon
    // change to tell the 3 states apart.
    const pillBase = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap";

    const state = signButtonState(log, currentUser?.id, readOnly);

    if (state === "signed") {
        return (
            <span className={`${pillBase} bg-emerald-50 text-emerald-700 border-emerald-200`}>
                <Check className="w-3 h-3" />
                {log.pilotSignedAt
                    ? new Date(log.pilotSignedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
                    : "Signé"}
            </span>
        );
    }

    // Unsigned but not signable (read-only, or the user is not the flight's pilot):
    // "Pending" status, no action.
    if (state === "pending") {
        return (
            <span className={`${pillBase} bg-slate-50 text-slate-500 border-slate-200`}>
                <Clock className="w-3 h-3" />
                En attente
            </span>
        );
    }

    const handleSign = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onTriggerEdit) {
            onTriggerEdit();
            return;
        }
        setLoading(true);
        try {
            const res = await signFlightLog(log.id);
            if ("error" in res) {
                toast({
                    title: "Erreur",
                    description: res.error,
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Entrée signée",
                    description: "Votre signature a été enregistrée.",
                    className: "bg-green-600 text-white border-none",
                });
                emitWalletChanged();
                onSigned({ ...log, pilotSigned: true, pilotSignedAt: new Date() });
            }
        } catch {
            toast({
                title: "Erreur technique",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleSign}
            disabled={loading}
            className={`${pillBase} bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50`}
        >
            {loading ? <Spinner size="small" className="w-3 h-3" /> : <PenLine className="w-3 h-3" />}
            Signer
        </button>
    );
});

SignFlightLogButton.displayName = "SignFlightLogButton";
export default SignFlightLogButton;
