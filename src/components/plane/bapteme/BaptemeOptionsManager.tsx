"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BaptemeOption, planes } from "@prisma/client";
import { Button } from "@/components/ui/button";
import FlightLoader from "@/components/loader/FlightLoader";
import AlertConfirmDeleted from "@/components/AlertConfirmDeleted";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getPlaneBaptemeOptions, deleteBaptemeOption } from "@/api/db/baptemeOptions";
import { formatBaptemeOptionLabel } from "@/lib/bapteme";
import BaptemeOptionForm from "./BaptemeOptionForm";

interface Props {
    plane: Pick<planes, "id">;
    /** Recharge la liste à chaque passage à true (ouverture de la fenêtre / de l'onglet). */
    active: boolean;
}

/**
 * Formules de baptême d'une machine du club (durée + tarif) : liste, ajout,
 * modification, suppression. Chaque formule est enregistrée immédiatement
 * par son propre server action. Utilisé dans la fenêtre « Tarifs » de la
 * liste des machines et dans la fiche de la machine.
 */
const BaptemeOptionsManager = ({ plane, active }: Props) => {
    const [loading, setLoading] = useState(true);
    const [options, setOptions] = useState<BaptemeOption[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingOption, setEditingOption] = useState<BaptemeOption | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await getPlaneBaptemeOptions(plane.id);
        if ("error" in res) {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
            setLoading(false);
            return;
        }
        setOptions(res.options);
        setLoading(false);
    }, [plane.id]);

    useEffect(() => {
        if (active) {
            void load();
            setShowForm(false);
            setEditingOption(null);
        }
    }, [active, load]);

    const handleSaved = (option: BaptemeOption) => {
        setOptions((prev) => {
            const exists = prev.some((o) => o.id === option.id);
            const next = exists ? prev.map((o) => (o.id === option.id ? option : o)) : [...prev, option];
            return next.sort((a, b) => a.durationMin - b.durationMin);
        });
        setShowForm(false);
        setEditingOption(null);
        toast({ title: "Formule enregistrée", className: "bg-green-600 text-white border-none" });
    };

    const handleDelete = async (optionID: string) => {
        setDeletingId(optionID);
        try {
            const res = await deleteBaptemeOption(optionID);
            if ("error" in res) {
                toast({ title: "Erreur", description: res.error, variant: "destructive" });
            } else {
                setOptions((prev) => prev.filter((o) => o.id !== optionID));
                toast({ title: "Formule supprimée", className: "bg-slate-800 text-white border-none" });
            }
        } finally {
            setDeletingId(null);
        }
    };

    const anyFormOpen = showForm || editingOption != null;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500">
                    Durées et tarifs proposés au client sur la page de réservation publique.
                </p>
                <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                        setShowForm(true);
                        setEditingOption(null);
                    }}
                    className="bg-[#774BBE] hover:bg-[#6538a5] text-white flex-shrink-0"
                >
                    <Plus className="w-4 h-4 mr-1" /> Formule
                </Button>
            </div>

            {loading ? (
                <FlightLoader variant="inline" />
            ) : (
                <>
                    {(showForm || editingOption) && (
                        <BaptemeOptionForm
                            planeID={plane.id}
                            option={editingOption ?? undefined}
                            onSaved={handleSaved}
                            onCancel={() => {
                                setShowForm(false);
                                setEditingOption(null);
                            }}
                        />
                    )}

                    {!anyFormOpen && (
                        options.length === 0 ? (
                            <p className="text-sm text-slate-400">
                                Aucune formule configurée. Le client ne pourra pas choisir de durée pour
                                cette machine.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {options.map((option) => (
                                    <div
                                        key={option.id}
                                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
                                    >
                                        <span className="text-sm font-medium text-slate-800">
                                            {formatBaptemeOptionLabel(option)}
                                        </span>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-500 hover:text-[#774BBE]"
                                                onClick={() => {
                                                    setEditingOption(option);
                                                    setShowForm(false);
                                                }}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <AlertConfirmDeleted
                                                title="Supprimer cette formule ?"
                                                description="Cette action est irréversible."
                                                cancel="Annuler"
                                                confirm="Supprimer"
                                                confirmAction={() => handleDelete(option.id)}
                                                loading={deletingId === option.id}
                                            >
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </AlertConfirmDeleted>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </>
            )}
        </div>
    );
};

export default BaptemeOptionsManager;
