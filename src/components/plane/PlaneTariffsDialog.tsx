"use client";

import React, { useEffect, useState } from "react";
import { planes } from "@prisma/client";
import { Euro, GraduationCap, Ticket } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/SpinnerVariants";
import { toast } from "@/hooks/use-toast";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { updatePlaneInstructionRate } from "@/api/db/planes";
import { clearCache } from "@/lib/cache";
import { cn } from "@/lib/utils";
import { centsToInput, parseEurosToCents } from "@/lib/wallet";
import BaptemeOptionsManager from "./bapteme/BaptemeOptionsManager";
import PlaneRateField from "./PlaneRateField";

type Tab = "instruction" | "bapteme";

interface Props {
    plane: planes;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Remonte le nouveau tarif écolage pour mettre à jour la ligne et la liste. */
    onRateSaved: (rateCents: number | null) => void;
}

/**
 * Raccourci « Tarifs » d'une machine du club : tarif écolage (portefeuille
 * élève, si activé pour le club) et formules de baptême, sélectionnés par un
 * interrupteur à deux positions. Les mêmes réglages existent dans la fiche.
 */
const PlaneTariffsDialog = ({ plane, open, onOpenChange, onRateSaved }: Props) => {
    const { currentClub } = useCurrentClub();
    const walletEnabled = !!currentClub?.walletEnabled;
    const [tab, setTab] = useState<Tab>(walletEnabled ? "instruction" : "bapteme");
    const [rateInput, setRateInput] = useState(centsToInput(plane.instructionHourlyRateCents));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open) return;
        setTab(walletEnabled ? "instruction" : "bapteme");
        setRateInput(centsToInput(plane.instructionHourlyRateCents));
        setError("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const saveRate = async () => {
        const cents = rateInput.trim() === "" ? null : parseEurosToCents(rateInput);
        if (rateInput.trim() !== "" && cents == null) {
            setError("Tarif écolage invalide (ex. : 120 ou 120,50).");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const res = await updatePlaneInstructionRate(plane.id, cents);
            if ("error" in res && res.error) {
                setError(res.error);
                return;
            }
            onRateSaved(cents);
            clearCache(`planes:${plane.clubID}`);
            toast({ title: "Tarif écolage enregistré", className: "bg-green-600 text-white border-none" });
            onOpenChange(false);
        } catch {
            setError("Une erreur technique est survenue.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95%] sm:max-w-[560px] p-0 gap-0 bg-white rounded-xl sm:rounded-2xl border-none shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
                <div className="bg-slate-50 p-6 pr-12 border-b border-slate-100 flex-shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <div className="p-2 bg-purple-100 text-[#774BBE] rounded-lg flex-shrink-0">
                                <Euro className="w-5 h-5" />
                            </div>
                            <span className="min-w-0 break-words">Tarifs — {plane.name}</span>
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 ml-11">
                            {walletEnabled
                                ? "Tarif des vols d'instruction et formules proposées en baptême."
                                : "Formules proposées en baptême."}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {walletEnabled && (
                    <div className="px-6 pt-4 flex-shrink-0">
                        <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1" role="tablist">
                            {([
                                ["instruction", "Écolage", GraduationCap],
                                ["bapteme", "Baptême", Ticket],
                            ] as const).map(([value, label, Icon]) => (
                                <button
                                    key={value}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === value}
                                    onClick={() => setTab(value)}
                                    className={cn(
                                        "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors",
                                        tab === value ? "bg-white text-[#774BBE] shadow-sm" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    <Icon className="h-4 w-4" /> {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                    {tab === "instruction" && walletEnabled ? (
                        <>
                            <PlaneRateField
                                value={rateInput}
                                onChange={setRateInput}
                                isPrivate={false}
                                instructorRateCents={currentClub?.instructorHourlyRateCents}
                                disabled={saving}
                            />
                            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-2.5">{error}</p>}
                            <div className="flex justify-end">
                                <Button onClick={saveRate} disabled={saving} className="bg-[#774BBE] hover:bg-[#6538a5] text-white min-w-[120px]">
                                    {saving ? <Spinner className="w-4 h-4 text-white" /> : "Enregistrer"}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <BaptemeOptionsManager plane={plane} active={open && tab === "bapteme"} />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PlaneTariffsDialog;
