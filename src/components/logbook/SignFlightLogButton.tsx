"use client";

import React, { useState } from "react";
import { flight_logs } from "@prisma/client";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { signFlightLog } from "@/api/db/logbook";
import { toast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/SpinnerVariants";
import { Check, Clock, PenLine } from "lucide-react";

interface Props {
    log: flight_logs;
    onSigned: (updated: flight_logs) => void;
    // Si fourni, le clic sur le bouton "Signer" délègue à ce callback (typiquement
    // pour ouvrir la popup de complétion qui validera puis signera) au lieu de
    // signer directement. Indépendamment, le clic est stop-propagé pour éviter
    // tout double-déclenchement avec un onClick parent (row click).
    onTriggerEdit?: () => void;
}

const SignFlightLogButton = React.memo(({ log, onSigned, onTriggerEdit }: Props) => {
    const { currentUser } = useCurrentUser();
    const [loading, setLoading] = useState(false);

    // Gabarit pill commun : même hauteur, même padding, même rythme — seules
    // couleur + icône changent pour différencier les 3 états.
    const pillBase = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap";

    if (log.pilotSigned) {
        return (
            <span className={`${pillBase} bg-emerald-50 text-emerald-700 border-emerald-200`}>
                <Check className="w-3 h-3" />
                {log.pilotSignedAt
                    ? new Date(log.pilotSignedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
                    : "Signé"}
            </span>
        );
    }

    if (currentUser?.id !== log.pilotID) {
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
                    title: "Entree signee",
                    description: "Votre signature a ete enregistree.",
                    className: "bg-green-600 text-white border-none",
                });
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
