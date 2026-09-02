"use client";

import React, { useState } from "react";
import { BaptemeOption } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/SpinnerVariants";
import { IoIosWarning } from "react-icons/io";
import { addBaptemeOption, updateBaptemeOption } from "@/api/db/baptemeOptions";
import { BaptemeOptionInput } from "@/schemas/baptemeOptions";

interface Props {
    planeID: string;
    // Formule à éditer ; absente => création.
    option?: BaptemeOption;
    onSaved: (option: BaptemeOption) => void;
    onCancel: () => void;
}

const BaptemeOptionForm = ({ planeID, option, onSaved, onCancel }: Props) => {
    const [durationMin, setDurationMin] = useState<string>(
        option ? String(option.durationMin) : ""
    );
    const [price, setPrice] = useState<string>(option ? String(option.price) : "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const onSubmit = async () => {
        setError("");
        const input: BaptemeOptionInput = {
            durationMin: durationMin ? parseInt(durationMin, 10) : NaN,
            price: price ? parseFloat(price) : NaN,
        };
        if (!input.durationMin || input.durationMin <= 0) {
            return setError("Renseignez une durée (en minutes) supérieure à 0");
        }
        if (Number.isNaN(input.price) || input.price < 0) {
            return setError("Renseignez un tarif");
        }

        setLoading(true);
        try {
            const res = option
                ? await updateBaptemeOption(option.id, input)
                : await addBaptemeOption(planeID, input);
            if ("error" in res) {
                setError(res.error ?? "Une erreur est survenue");
            } else if (res.option) {
                onSaved(res.option);
            }
        } catch {
            setError("Une erreur inattendue est survenue.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <h4 className="text-sm font-semibold text-slate-800">
                {option ? "Modifier la formule" : "Nouvelle formule"}
            </h4>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Durée (minutes)</Label>
                    <Input
                        type="number"
                        min="1"
                        step="1"
                        value={durationMin}
                        disabled={loading}
                        placeholder="Ex. 30"
                        onChange={(e) => setDurationMin(e.target.value)}
                        className="bg-white border-slate-200 font-mono"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Tarif (€)</Label>
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={price}
                        disabled={loading}
                        placeholder="Ex. 90"
                        onChange={(e) => setPrice(e.target.value)}
                        className="bg-white border-slate-200 font-mono"
                    />
                </div>
            </div>
            <p className="text-xs text-slate-400">
                Le créneau du calendrier reste d&apos;une heure quelle que soit la formule choisie :
                seule la durée affichée au client change.
            </p>

            {error && (
                <div className="text-red-600 bg-red-50 border border-red-100 p-2.5 rounded-lg flex items-center gap-2 text-sm">
                    <IoIosWarning className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading} className="text-slate-600">
                    Annuler
                </Button>
                <Button
                    size="sm"
                    onClick={onSubmit}
                    disabled={loading}
                    className="bg-[#774BBE] hover:bg-[#6538a5] text-white min-w-[100px]"
                >
                    {loading ? <Spinner className="text-white w-4 h-4" /> : option ? "Enregistrer" : "Créer"}
                </Button>
            </div>
        </div>
    );
};

export default BaptemeOptionForm;
