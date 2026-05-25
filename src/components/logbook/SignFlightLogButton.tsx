"use client";

import React, { useState } from "react";
import { flight_logs } from "@prisma/client";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { signFlightLog } from "@/api/db/logbook";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/SpinnerVariants";
import { CheckCircle2, Clock } from "lucide-react";

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

    if (log.pilotSigned) {
        return (
            <div className="flex items-center gap-1.5 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-medium">
                    {log.pilotSignedAt
                        ? new Date(log.pilotSignedAt).toLocaleDateString("fr-FR")
                        : "Signe"}
                </span>
            </div>
        );
    }

    if (currentUser?.id !== log.pilotID) {
        return (
            <div className="flex items-center gap-1.5 text-amber-500">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium">En attente</span>
            </div>
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
        <Button
            variant="outline"
            size="sm"
            onClick={handleSign}
            disabled={loading}
            className="text-xs border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700 h-7 px-2"
        >
            {loading ? <Spinner size="small" className="w-3 h-3" /> : "Signer"}
        </Button>
    );
});

SignFlightLogButton.displayName = "SignFlightLogButton";
export default SignFlightLogButton;
